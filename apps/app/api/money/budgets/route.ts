import { and, asc, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyBudget, moneyCategory } from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { budgetCreateSchema } from "@/lib/validators/money";

export async function GET(req: Request) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const conditions = [eq(moneyBudget.workspaceId, ctx.workspaceId)];
  if (from) conditions.push(gte(moneyBudget.periodEnd, new Date(from)));
  if (to) conditions.push(lte(moneyBudget.periodStart, new Date(to)));

  const rows = await db
    .select()
    .from(moneyBudget)
    .where(and(...conditions))
    .orderBy(asc(moneyBudget.periodStart));

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
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

  const parsed = budgetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const start = new Date(parsed.data.periodStart);
  const end = new Date(parsed.data.periodEnd);
  if (end <= start) return badRequest("periodEnd must be after periodStart");

  if (parsed.data.categoryId) {
    const cat = await db
      .select({ id: moneyCategory.id })
      .from(moneyCategory)
      .where(
        and(
          eq(moneyCategory.id, parsed.data.categoryId),
          eq(moneyCategory.workspaceId, ctx.workspaceId),
        ),
      )
      .limit(1);
    if (!cat.length) return badRequest("Invalid category");
  }

  const [created] = await db
    .insert(moneyBudget)
    .values({
      workspaceId: ctx.workspaceId,
      categoryId: parsed.data.categoryId ?? null,
      periodStart: start,
      periodEnd: end,
      limitAmountMinor: parsed.data.limitAmountMinor,
      currency: parsed.data.currency ?? "USD",
    })
    .returning();

  return NextResponse.json({
    data: {
      ...created,
      periodStart: created.periodStart.toISOString(),
      periodEnd: created.periodEnd.toISOString(),
      createdAt: created.createdAt.toISOString(),
    },
  });
}
