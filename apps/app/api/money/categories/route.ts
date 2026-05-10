import { and, asc, desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyCategory, moneyTransaction } from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { assertValidCategoryParent } from "@/lib/money-category-parent";
import { categoryCreateSchema } from "@/lib/validators/money";

const USAGE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export async function GET() {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const since = new Date(Date.now() - USAGE_WINDOW_MS);

  const rows = await db
    .select({
      ...getTableColumns(moneyCategory),
      usageCount: sql<number>`count(${moneyTransaction.id})::int`.as("usage_count"),
    })
    .from(moneyCategory)
    .leftJoin(
      moneyTransaction,
      and(
        eq(moneyTransaction.categoryId, moneyCategory.id),
        eq(moneyTransaction.workspaceId, ctx.workspaceId),
        gte(moneyTransaction.occurredAt, since),
      ),
    )
    .where(eq(moneyCategory.workspaceId, ctx.workspaceId))
    .groupBy(moneyCategory.id)
    .orderBy(desc(sql`usage_count`), asc(moneyCategory.name));

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
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

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  if (parsed.data.parentId) {
    const err = await assertValidCategoryParent(
      ctx.workspaceId,
      parsed.data.parentId,
    );
    if (err) return badRequest(err);
  }

  const [created] = await db
    .insert(moneyCategory)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      parentId: parsed.data.parentId ?? null,
    })
    .returning();

  return NextResponse.json({
    data: {
      ...created,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
