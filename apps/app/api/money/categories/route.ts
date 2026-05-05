import { asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyCategory } from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { assertValidCategoryParent } from "@/lib/money-category-parent";
import { categoryCreateSchema } from "@/lib/validators/money";

export async function GET() {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const rows = await db
    .select()
    .from(moneyCategory)
    .where(eq(moneyCategory.workspaceId, ctx.workspaceId))
    .orderBy(
      sql`case when ${moneyCategory.parentId} is null then 0 else 1 end`,
      asc(moneyCategory.parentId),
      asc(moneyCategory.name),
    );

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
