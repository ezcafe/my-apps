import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/db";
import {
  moneyAccount,
  moneyRule,
  moneyTag,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import {
  badRequest,
  requireMoneyContext,
} from "@/lib/api-money";
import {
  analyticsFilterFieldsFromUrl,
  moneyTransactionConditionsForAnalytics,
} from "@/lib/money-transaction-analytics-conditions";
import {
  applyTransactionBalanceEffect,
  type TxRowForBalance,
} from "@/lib/money-account-balance";
import { applyRulesToTransaction } from "@/lib/rules";
import {
  transactionCreateSchema,
  transactionListQuerySchema,
} from "@/lib/validators/money";

const sortColumnMap = {
  occurredAt: moneyTransaction.occurredAt,
  amountMinor: moneyTransaction.amountMinor,
  kind: moneyTransaction.kind,
  createdAt: moneyTransaction.createdAt,
} as const;

export async function GET(req: Request) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const url = new URL(req.url);
  const parsed = transactionListQuerySchema.safeParse({
    ...analyticsFilterFieldsFromUrl(url),
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    dir: url.searchParams.get("dir") ?? undefined,
  });
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") ||
        "Invalid query",
    );
  }

  const q = parsed.data;
  const filterSlice: Parameters<typeof moneyTransactionConditionsForAnalytics>[1] =
    {
      from: q.from,
      to: q.to,
      accountIds: q.accountIds,
      categoryIds: q.categoryIds,
      merchantIds: q.merchantIds,
      tagIds: q.tagIds,
      kinds: q.kinds,
    };

  const conditions = moneyTransactionConditionsForAnalytics(
    ctx.workspaceId,
    filterSlice,
  );

  const legacyAccountId = url.searchParams.get("accountId");
  const legacyCategoryId = url.searchParams.get("categoryId");
  if (legacyAccountId && z.string().uuid().safeParse(legacyAccountId).success) {
    conditions.push(eq(moneyTransaction.accountId, legacyAccountId));
  }
  if (
    legacyCategoryId &&
    z.string().uuid().safeParse(legacyCategoryId).success
  ) {
    conditions.push(eq(moneyTransaction.categoryId, legacyCategoryId));
  }

  const whereClause = and(...conditions);
  const orderCol = sortColumnMap[q.sort];
  const orderExpr =
    q.dir === "asc" ? asc(orderCol) : desc(orderCol);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(moneyTransaction)
    .where(whereClause);

  const offset = (q.page - 1) * q.pageSize;

  const rows = await db
    .select()
    .from(moneyTransaction)
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(q.pageSize)
    .offset(offset);

  const ids = rows.map((r) => r.id);
  const tagLinks =
    ids.length === 0
      ? []
      : await db
          .select({
            transactionId: moneyTransactionTag.transactionId,
            tagId: moneyTransactionTag.tagId,
          })
          .from(moneyTransactionTag)
          .where(inArray(moneyTransactionTag.transactionId, ids));

  const tagIdsByTx = new Map<string, string[]>();
  for (const link of tagLinks) {
    const cur = tagIdsByTx.get(link.transactionId) ?? [];
    cur.push(link.tagId);
    tagIdsByTx.set(link.transactionId, cur);
  }

  const data = rows.map((r) => ({
    ...r,
    occurredAt: r.occurredAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    tagIds: tagIdsByTx.get(r.id) ?? [],
  }));

  return NextResponse.json({
    data,
    total,
    page: q.page,
    pageSize: q.pageSize,
  });
}

export async function POST(req: Request) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = transactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const accountRow = await db
    .select({ id: moneyAccount.id, name: moneyAccount.name })
    .from(moneyAccount)
    .where(
      and(
        eq(moneyAccount.id, parsed.data.accountId),
        eq(moneyAccount.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!accountRow.length) return badRequest("Invalid account");
  let toAccountId: string | null = null;
  let toAccountRow: { id: string; name: string }[] = [];
  if (parsed.data.kind === "transfer") {
    toAccountId = parsed.data.toAccountId ?? null;
    if (!toAccountId) return badRequest("Destination account is required");
    if (toAccountId === parsed.data.accountId) {
      return badRequest("From and destination accounts must be different");
    }
    toAccountRow = await db
      .select({ id: moneyAccount.id, name: moneyAccount.name })
      .from(moneyAccount)
      .where(
        and(
          eq(moneyAccount.id, toAccountId),
          eq(moneyAccount.workspaceId, ctx.workspaceId),
        ),
      )
      .limit(1);
    if (!toAccountRow.length) return badRequest("Invalid destination account");
  }

  const kind = parsed.data.kind;
  const occurredAt = parsed.data.occurredAt
    ? new Date(parsed.data.occurredAt)
    : new Date();

  const rules = await db
    .select({
      priority: moneyRule.priority,
      match: moneyRule.match,
      action: moneyRule.action,
    })
    .from(moneyRule)
    .where(
      and(
        eq(moneyRule.workspaceId, ctx.workspaceId),
        eq(moneyRule.active, true),
      ),
    );

  const ruleModels = rules.map((r) => ({
    priority: r.priority,
    match: r.match as Parameters<typeof applyRulesToTransaction>[1][number]["match"],
    action: r.action as Parameters<typeof applyRulesToTransaction>[1][number]["action"],
  }));

  const afterRules = applyRulesToTransaction(
    {
      accountId: parsed.data.accountId,
      merchantId: parsed.data.merchantId ?? null,
      categoryId: parsed.data.categoryId ?? null,
      tagIds: parsed.data.tagIds ?? [],
    },
    ruleModels,
  );

  const baseTagIds = [...new Set(afterRules.tagIds ?? [])];
  if (baseTagIds.length) {
    const tagsOk = await db
      .select({ id: moneyTag.id })
      .from(moneyTag)
      .where(
        and(
          eq(moneyTag.workspaceId, ctx.workspaceId),
          inArray(moneyTag.id, baseTagIds),
        ),
      );
    if (tagsOk.length !== baseTagIds.length) {
      return badRequest("Invalid tag reference");
    }
  }

  const normalizedTagNames = [
    ...new Set(
      (parsed.data.tagNames ?? [])
        .map((n) => n.trim())
        .filter((n) => n.length > 0),
    ),
  ];
  if (normalizedTagNames.length > 50) {
    return badRequest("Too many tags");
  }

  try {
    const created = await db.transaction(async (tx) => {
      const fromNames: string[] = [];
      for (const name of normalizedTagNames) {
        const [existing] = await tx
          .select({ id: moneyTag.id })
          .from(moneyTag)
          .where(
            and(
              eq(moneyTag.workspaceId, ctx.workspaceId),
              eq(moneyTag.name, name),
            ),
          )
          .limit(1);
        if (existing) {
          fromNames.push(existing.id);
        } else {
          const [inserted] = await tx
            .insert(moneyTag)
            .values({ workspaceId: ctx.workspaceId, name })
            .returning({ id: moneyTag.id });
          fromNames.push(inserted.id);
        }
      }

      const uniqueTags = [...new Set([...baseTagIds, ...fromNames])];

      if (kind !== "transfer") {
        const [row] = await tx
          .insert(moneyTransaction)
          .values({
            workspaceId: ctx.workspaceId,
            accountId: parsed.data.accountId,
            kind,
            amountMinor: parsed.data.amountMinor,
            occurredAt,
            categoryId: afterRules.categoryId ?? null,
            merchantId: afterRules.merchantId ?? parsed.data.merchantId ?? null,
            notes: parsed.data.notes ?? null,
            createdBySub: ctx.userSub,
          })
          .returning();

        if (uniqueTags.length) {
          await tx.insert(moneyTransactionTag).values(
            uniqueTags.map((tagId) => ({
              transactionId: row.id,
              tagId,
            })),
          );
        }

        const balanceRow: TxRowForBalance = {
          id: row.id,
          accountId: row.accountId,
          kind: row.kind,
          amountMinor: row.amountMinor,
          occurredAt: row.occurredAt,
          createdAt: row.createdAt,
          transferPairId: row.transferPairId,
        };
        await applyTransactionBalanceEffect(tx, ctx.workspaceId, balanceRow, 1);
        return { row, uniqueTags };
      }

      const transferPairId = randomUUID();
      const fromAccountName = accountRow[0].name;
      const toAccountName = toAccountRow[0].name;
      const customNotes = parsed.data.notes?.trim();
      const fromTransferNote = `Transfer to ${toAccountName}${
        customNotes ? ` | ${customNotes}` : ""
      }`;
      const toTransferNote = `Transfer from ${fromAccountName}${
        customNotes ? ` | ${customNotes}` : ""
      }`;
      const transferValues = {
        workspaceId: ctx.workspaceId,
        kind,
        amountMinor: parsed.data.amountMinor,
        occurredAt,
        categoryId: null,
        merchantId: null,
        createdBySub: ctx.userSub,
        transferPairId,
      } as const;
      const [fromRow] = await tx
        .insert(moneyTransaction)
        .values({
          ...transferValues,
          accountId: parsed.data.accountId,
          notes: fromTransferNote,
        })
        .returning();
      const [toRow] = await tx
        .insert(moneyTransaction)
        .values({
          ...transferValues,
          accountId: toAccountId!,
          notes: toTransferNote,
        })
        .returning();

      if (uniqueTags.length) {
        await tx.insert(moneyTransactionTag).values(
          [fromRow.id, toRow.id].flatMap((transactionId) =>
            uniqueTags.map((tagId) => ({
              transactionId,
              tagId,
            })),
          ),
        );
      }

      const fromBalanceRow: TxRowForBalance = {
        id: fromRow.id,
        accountId: fromRow.accountId,
        kind: fromRow.kind,
        amountMinor: fromRow.amountMinor,
        occurredAt: fromRow.occurredAt,
        createdAt: fromRow.createdAt,
        transferPairId: fromRow.transferPairId,
      };
      const toBalanceRow: TxRowForBalance = {
        id: toRow.id,
        accountId: toRow.accountId,
        kind: toRow.kind,
        amountMinor: toRow.amountMinor,
        occurredAt: toRow.occurredAt,
        createdAt: toRow.createdAt,
        transferPairId: toRow.transferPairId,
      };
      await applyTransactionBalanceEffect(tx, ctx.workspaceId, fromBalanceRow, 1);
      await applyTransactionBalanceEffect(tx, ctx.workspaceId, toBalanceRow, 1);

      return { row: fromRow, uniqueTags };
    });

    return NextResponse.json({
      data: {
        ...created.row,
        occurredAt: created.row.occurredAt.toISOString(),
        createdAt: created.row.createdAt.toISOString(),
        updatedAt: created.row.updatedAt.toISOString(),
        tagIds: created.uniqueTags,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("money_tag_workspace_name_uq") || msg.includes("unique")) {
      return badRequest("Duplicate tag name");
    }
    throw e;
  }
}
