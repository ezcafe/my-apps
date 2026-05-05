import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyRecurrentTemplate } from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { recurrentCreateSchema } from "@/lib/validators/money";

export async function GET() {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const rows = await db
    .select()
    .from(moneyRecurrentTemplate)
    .where(eq(moneyRecurrentTemplate.workspaceId, ctx.workspaceId))
    .orderBy(asc(moneyRecurrentTemplate.name));

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      nextRunAt: r.nextRunAt.toISOString(),
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

  const parsed = recurrentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
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

  return NextResponse.json({
    data: {
      ...created,
      nextRunAt: created.nextRunAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
    },
  });
}
