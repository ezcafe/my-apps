import { asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyRule } from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { ruleCreateSchema } from "@/lib/validators/money";

export async function GET() {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const rows = await db
    .select()
    .from(moneyRule)
    .where(eq(moneyRule.workspaceId, ctx.workspaceId))
    .orderBy(desc(moneyRule.priority), asc(moneyRule.name));

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

  const parsed = ruleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const [created] = await db
    .insert(moneyRule)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      priority: parsed.data.priority ?? 0,
      match: parsed.data.match,
      action: parsed.data.action,
      active: parsed.data.active ?? true,
    })
    .returning();

  return NextResponse.json({
    data: {
      ...created,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
