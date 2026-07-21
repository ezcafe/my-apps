import { NextResponse } from "next/server";
import {
  badRequest,
  notFound,
  requireSavingsContext,
  withSavingsWorkspaceRls,
} from "@/lib/api-savings";
import {
  deleteSavingsActivity,
  getSavingsActivity,
  updateSavingsActivity,
} from "@/lib/savings-services/activities";
import { savingsActivityUpdateSchema } from "@/lib/validators/savings";
import { readJsonBounded } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const ctx = await requireSavingsContext(req);
  if ("error" in ctx) return ctx.error;
  const { id } = await context.params;

  const row = await withSavingsWorkspaceRls(ctx, () =>
    getSavingsActivity(ctx.workspaceId, id),
  );
  if (!row) return notFound();
  return NextResponse.json({ data: row });
}

export async function PATCH(req: Request, context: RouteContext) {
  const ctx = await requireSavingsContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await readJsonBounded(req);
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = savingsActivityUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    const row = await withSavingsWorkspaceRls(ctx, () =>
      updateSavingsActivity(ctx.workspaceId, id, parsed.data),
    );
    return NextResponse.json({ data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NOT_FOUND") return notFound();
    return badRequest(msg);
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const ctx = await requireSavingsContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const { id } = await context.params;

  try {
    await withSavingsWorkspaceRls(ctx, () =>
      deleteSavingsActivity(ctx.workspaceId, id),
    );
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NOT_FOUND") return notFound();
    return badRequest(msg);
  }
}
