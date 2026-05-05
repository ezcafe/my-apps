import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyAccount } from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { accountCreateSchema } from "@/lib/validators/money";

export async function GET() {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const rows = await db
    .select()
    .from(moneyAccount)
    .where(eq(moneyAccount.workspaceId, ctx.workspaceId))
    .orderBy(asc(moneyAccount.sortOrder), asc(moneyAccount.name));

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

  const parsed = accountCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const [created] = await db
    .insert(moneyAccount)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      type: parsed.data.type ?? "checking",
      currency: parsed.data.currency ?? "USD",
      institution: parsed.data.institution ?? null,
      balanceMinor: parsed.data.balanceMinor,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({
    data: {
      ...created,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
