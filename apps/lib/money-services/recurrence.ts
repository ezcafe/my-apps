import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db, runInWorkspace } from "@/db";
import {
  moneyAccount,
  moneyRecurrentTemplate,
  moneyTag,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import {
  applyTransactionBalanceEffect,
  type TxRowForBalance,
} from "@/lib/money-account-balance";
import { assertCategoryKindMatches } from "@/lib/money-category-kind-check";
import {
  addCadence,
  recurrenceCadenceAllowedInCurrentEnv,
  type MoneyCadence,
} from "@/lib/recurrence";
import {
  recurrentCreateSchema,
  recurrentTemplateBodySchema,
  categoryKindForTransactionKind,
} from "@/lib/validators/money";
import type { MoneyWorkspaceCtx } from "@/lib/money-services/types";

export async function listMoneyRecurrenceTemplates(workspaceId: string) {
  const rows = await db
    .select()
    .from(moneyRecurrentTemplate)
    .where(eq(moneyRecurrentTemplate.workspaceId, workspaceId))
    .orderBy(asc(moneyRecurrentTemplate.name));

  return rows.map((r) => ({
    ...r,
    nextRunAt: r.nextRunAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createMoneyRecurrenceTemplate(
  ctx: MoneyWorkspaceCtx,
  body: unknown,
) {
  const parsed = recurrentCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  if (!recurrenceCadenceAllowedInCurrentEnv(parsed.data.cadence)) {
    throw new Error("Recurrence cadence is not available in production");
  }

  const tplKind = parsed.data.template.kind;
  const tplCategoryId = parsed.data.template.categoryId ?? null;
  if (tplKind === "transfer" && tplCategoryId) {
    throw new Error("Transfer templates cannot reference a category");
  }
  if (tplKind !== "transfer" && tplCategoryId) {
    const expected = categoryKindForTransactionKind(tplKind);
    if (expected) {
      await assertCategoryKindMatches(ctx.workspaceId, tplCategoryId, expected);
    }
  }

  const [created] = await db
    .insert(moneyRecurrentTemplate)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      cadence: parsed.data.cadence,
      nextRunAt: new Date(parsed.data.nextRunAt),
      template: parsed.data.template,
      active: parsed.data.active ?? true,
    })
    .returning();

  return {
    ...created,
    nextRunAt: created.nextRunAt.toISOString(),
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateMoneyRecurrenceTemplate(
  ctx: MoneyWorkspaceCtx,
  id: string,
  body: unknown,
) {
  const parsed = recurrentCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  if (
    parsed.data.cadence &&
    !recurrenceCadenceAllowedInCurrentEnv(parsed.data.cadence)
  ) {
    throw new Error("Recurrence cadence is not available in production");
  }

  if (parsed.data.template) {
    const tplKind = parsed.data.template.kind;
    const tplCategoryId = parsed.data.template.categoryId ?? null;
    if (tplKind === "transfer" && tplCategoryId) {
      throw new Error("Transfer templates cannot reference a category");
    }
    if (tplKind !== "transfer" && tplCategoryId) {
      const expected = categoryKindForTransactionKind(tplKind);
      if (expected) {
        await assertCategoryKindMatches(ctx.workspaceId, tplCategoryId, expected);
      }
    }
  }

  const raw = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  const updates: Record<string, unknown> = { ...raw };
  if (parsed.data.nextRunAt) {
    updates.nextRunAt = new Date(parsed.data.nextRunAt);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No updates");
  }

  const [updated] = await db
    .update(moneyRecurrentTemplate)
    .set(updates as typeof moneyRecurrentTemplate.$inferInsert)
    .where(
      and(
        eq(moneyRecurrentTemplate.id, id),
        eq(moneyRecurrentTemplate.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!updated) throw new Error("NOT_FOUND");

  return {
    ...updated,
    nextRunAt: updated.nextRunAt.toISOString(),
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteMoneyRecurrenceTemplate(
  ctx: MoneyWorkspaceCtx,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(moneyRecurrentTemplate)
    .where(
      and(
        eq(moneyRecurrentTemplate.id, id),
        eq(moneyRecurrentTemplate.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: moneyRecurrentTemplate.id });

  return deleted.length > 0;
}

export async function generateMoneyRecurrenceOccurrence(
  ctx: MoneyWorkspaceCtx,
  id: string,
) {
  const row = await db
    .select()
    .from(moneyRecurrentTemplate)
    .where(
      and(
        eq(moneyRecurrentTemplate.id, id),
        eq(moneyRecurrentTemplate.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  const tplRow = row[0];
  if (!tplRow) throw new Error("NOT_FOUND");
  if (!tplRow.active) throw new Error("Template inactive");

  const parsedTpl = recurrentTemplateBodySchema.safeParse(tplRow.template);
  if (!parsedTpl.success) {
    throw new Error("Invalid stored template");
  }

  const t = parsedTpl.data;

  const accountOk = await db
    .select({ id: moneyAccount.id })
    .from(moneyAccount)
    .where(
      and(
        eq(moneyAccount.id, t.accountId),
        eq(moneyAccount.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!accountOk.length) throw new Error("Invalid template account");

  const tagIds = [...new Set(t.tagIds ?? [])];
  if (tagIds.length) {
    const tagsOk = await db
      .select({ id: moneyTag.id })
      .from(moneyTag)
      .where(
        and(
          eq(moneyTag.workspaceId, ctx.workspaceId),
          inArray(moneyTag.id, tagIds),
        ),
      );
    if (tagsOk.length !== tagIds.length) {
      throw new Error("Invalid template tags");
    }
  }

  const occurredAt = tplRow.nextRunAt;

  const next = addCadence(tplRow.nextRunAt, tplRow.cadence as MoneyCadence);

  const created = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(moneyTransaction)
      .values({
        workspaceId: ctx.workspaceId,
        accountId: t.accountId,
        kind: t.kind,
        amountMinor: t.amountMinor,
        occurredAt,
        categoryId: t.categoryId ?? null,
        merchantId: t.merchantId ?? null,
        notes: t.notes ?? null,
        createdBySub: ctx.userSub,
        recurrenceSourceId: tplRow.id,
        excludeFromAnalyticsAndBudget: t.excludeFromAnalyticsAndBudget ?? false,
      })
      .returning();

    if (!inserted) {
      throw new Error("Recurrence insert returned no row");
    }

    const balanceRow: TxRowForBalance = {
      id: inserted.id,
      accountId: inserted.accountId,
      kind: inserted.kind,
      amountMinor: inserted.amountMinor,
      occurredAt: inserted.occurredAt,
      createdAt: inserted.createdAt,
      transferPairId: inserted.transferPairId,
    };
    await applyTransactionBalanceEffect(tx, ctx.workspaceId, balanceRow, 1);

    if (tagIds.length) {
      await tx.insert(moneyTransactionTag).values(
        tagIds.map((tagId) => ({
          transactionId: inserted.id,
          tagId,
        })),
      );
    }

    await tx
      .update(moneyRecurrentTemplate)
      .set({ nextRunAt: next })
      .where(eq(moneyRecurrentTemplate.id, id));

    return inserted;
  });

  return {
    transaction: {
      ...created,
      occurredAt: created.occurredAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      tagIds,
    },
    nextRunAt: next.toISOString(),
  };
}

const MAX_TEMPLATES_PER_RUN = 500;
/** Safety cap when fast-forwarding nextRunAt without posting transactions. */
const MAX_FAST_FORWARD_STEPS = 10_000;

export type ProcessDueRecurrenceResult = {
  processed: number;
  generated: number;
  errors: Array<{ templateId: string; message: string }>;
};

export async function processDueMoneyRecurrenceTemplates(): Promise<ProcessDueRecurrenceResult> {
  const now = new Date();
  const dueRows = await db
    .select({
      id: moneyRecurrentTemplate.id,
      workspaceId: moneyRecurrentTemplate.workspaceId,
      cadence: moneyRecurrentTemplate.cadence,
      nextRunAt: moneyRecurrentTemplate.nextRunAt,
    })
    .from(moneyRecurrentTemplate)
    .where(
      and(
        eq(moneyRecurrentTemplate.active, true),
        lte(moneyRecurrentTemplate.nextRunAt, now),
      ),
    )
    .orderBy(asc(moneyRecurrentTemplate.nextRunAt))
    .limit(MAX_TEMPLATES_PER_RUN);

  const result: ProcessDueRecurrenceResult = {
    processed: 0,
    generated: 0,
    errors: [],
  };

  for (const due of dueRows) {
    result.processed += 1;
    try {
      await runInWorkspace(due.workspaceId, async () => {
        const ctx: MoneyWorkspaceCtx = {
          workspaceId: due.workspaceId,
          userSub: "system:recurrence-cron",
        };

        const beforeRow = await db
          .select({
            active: moneyRecurrentTemplate.active,
            nextRunAt: moneyRecurrentTemplate.nextRunAt,
            cadence: moneyRecurrentTemplate.cadence,
          })
          .from(moneyRecurrentTemplate)
          .where(
            and(
              eq(moneyRecurrentTemplate.id, due.id),
              eq(moneyRecurrentTemplate.workspaceId, due.workspaceId),
            ),
          )
          .limit(1);
        const before = beforeRow[0];
        if (!before?.active || before.nextRunAt > now) {
          return;
        }

        const genResult = await generateMoneyRecurrenceOccurrence(ctx, due.id);
        result.generated += 1;

        let fastForwardSteps = 0;
        let nextRunAtAfterGenerate = new Date(genResult.nextRunAt);
        while (
          fastForwardSteps < MAX_FAST_FORWARD_STEPS &&
          nextRunAtAfterGenerate <= now
        ) {
          nextRunAtAfterGenerate = addCadence(
            nextRunAtAfterGenerate,
            before.cadence as MoneyCadence,
          );
          fastForwardSteps += 1;
        }

        if (fastForwardSteps > 0) {
          await db
            .update(moneyRecurrentTemplate)
            .set({ nextRunAt: nextRunAtAfterGenerate })
            .where(
              and(
                eq(moneyRecurrentTemplate.id, due.id),
                eq(moneyRecurrentTemplate.workspaceId, due.workspaceId),
              ),
            );
        }
      });
    } catch (e: unknown) {
      result.errors.push({
        templateId: due.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return result;
}
