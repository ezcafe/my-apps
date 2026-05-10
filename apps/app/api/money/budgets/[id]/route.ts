import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyBudget } from "@/db/schema/money";
import { badRequest, notFound, requireMoneyContext } from "@/lib/api-money";
import { assertBudgetTargetInWorkspace } from "@/lib/money-budget-target";
import { getWorkspaceDefaultCurrency } from "@/lib/workspace";
import { budgetCreateSchema, moneyBudgetScopeTypeSchema } from "@/lib/validators/money";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const budgetPatchSchema = z
  .object({
    scopeType: moneyBudgetScopeTypeSchema.optional(),
    scopeId: z.string().uuid().nullable().optional(),
    limitAmountMinor: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scopeType === "workspace" && data.scopeId != null && data.scopeId !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopeId"],
        message: "scopeId must be omitted for workspace budgets",
      });
    }
  });

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = budgetPatchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return badRequest("No updates");
  }

  const [existing] = await db
    .select()
    .from(moneyBudget)
    .where(and(eq(moneyBudget.id, id), eq(moneyBudget.workspaceId, ctx.workspaceId)))
    .limit(1);

  if (!existing) return notFound();

  const nextScopeType = parsed.data.scopeType ?? existing.scopeType;
  let nextScopeId: string | null;
  if (nextScopeType === "workspace") {
    nextScopeId = null;
  } else if (parsed.data.scopeId !== undefined) {
    nextScopeId = parsed.data.scopeId;
  } else if (parsed.data.scopeType !== undefined) {
    nextScopeId = existing.scopeId;
  } else {
    nextScopeId = existing.scopeId;
  }

  const merged = {
    scopeType: nextScopeType,
    scopeId: nextScopeId,
    limitAmountMinor: parsed.data.limitAmountMinor ?? existing.limitAmountMinor,
    currency: existing.currency,
  };

  const full = budgetCreateSchema.safeParse(merged);
  if (!full.success) {
    return badRequest(
      full.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const resolvedScopeId =
    full.data.scopeType === "workspace" ? null : (full.data.scopeId ?? null);
  const targetErr = await assertBudgetTargetInWorkspace(
    ctx.workspaceId,
    full.data.scopeType,
    resolvedScopeId,
  );
  if (targetErr) return badRequest(targetErr);

  try {
    const [updated] = await db
      .update(moneyBudget)
      .set({
        scopeType: full.data.scopeType,
        scopeId: resolvedScopeId,
        limitAmountMinor: full.data.limitAmountMinor,
      })
      .where(and(eq(moneyBudget.id, id), eq(moneyBudget.workspaceId, ctx.workspaceId)))
      .returning();

    if (!updated) return notFound();
    const workspaceCurrency =
      (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";

    return NextResponse.json({
      data: {
        id: updated.id,
        workspaceId: updated.workspaceId,
        scopeType: updated.scopeType,
        scopeId: updated.scopeId,
        limitAmountMinor: updated.limitAmountMinor,
        currency: workspaceCurrency,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "23505") {
      return badRequest("A budget already exists for this scope");
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  const deleted = await db
    .delete(moneyBudget)
    .where(
      and(eq(moneyBudget.id, id), eq(moneyBudget.workspaceId, ctx.workspaceId)),
    )
    .returning({ id: moneyBudget.id });

  if (!deleted.length) return notFound();

  return NextResponse.json({ data: { ok: true } });
}
