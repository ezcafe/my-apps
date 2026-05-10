import { and, asc, desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyAccount, moneyTransaction } from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { getWorkspaceDefaultCurrency } from "@/lib/workspace";
import { accountCreateSchema } from "@/lib/validators/money";

const USAGE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export async function GET() {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const since = new Date(Date.now() - USAGE_WINDOW_MS);

  const rows = await db
    .select({
      ...getTableColumns(moneyAccount),
      usageCount: sql<number>`count(${moneyTransaction.id})::int`.as("usage_count"),
    })
    .from(moneyAccount)
    .leftJoin(
      moneyTransaction,
      and(
        eq(moneyTransaction.accountId, moneyAccount.id),
        eq(moneyTransaction.workspaceId, ctx.workspaceId),
        gte(moneyTransaction.occurredAt, since),
      ),
    )
    .where(eq(moneyAccount.workspaceId, ctx.workspaceId))
    .groupBy(moneyAccount.id)
    .orderBy(desc(sql`usage_count`), asc(moneyAccount.name));

  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      currency: workspaceCurrency,
      createdAt: r.createdAt.toISOString(),
    })),
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

  const parsed = accountCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";
  const [created] = await db
    .insert(moneyAccount)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      type: parsed.data.type ?? "checking",
      currency: workspaceCurrency,
      institution: parsed.data.institution ?? null,
      balanceMinor: parsed.data.balanceMinor,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({
    data: {
      ...created,
      currency: workspaceCurrency,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
