import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyMerchant } from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { merchantCreateSchema } from "@/lib/validators/money";

export async function GET() {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const rows = await db
    .select()
    .from(moneyMerchant)
    .where(eq(moneyMerchant.workspaceId, ctx.workspaceId))
    .orderBy(asc(moneyMerchant.name));

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

  const parsed = merchantCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const [created] = await db
    .insert(moneyMerchant)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      normalizedName:
        parsed.data.normalizedName ??
        parsed.data.name.toLowerCase().replace(/\s+/g, " ").trim(),
    })
    .returning();

  return NextResponse.json({
    data: {
      ...created,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
