import { NextResponse } from "next/server";
import {
  badRequest,
  notFound,
  requireInvestmentContext,
  withInvestmentWorkspaceRls,
} from "@/lib/api-investment";
import {
  deleteInvestmentActivity,
  getInvestmentActivity,
  updateInvestmentActivity,
} from "@/lib/investment-services/activities";
import { investmentActivityUpdateSchema } from "@/lib/validators/investment";
import { assertSameOriginStrict, readJsonBounded } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function requireSameOrigin(req: Request): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return null;
  if (!assertSameOriginStrict(req)) {
    return badRequest("Cross-origin request blocked");
  }
  return null;
}

export async function GET(req: Request, context: RouteContext) {
  const csrf = await requireSameOrigin(req);
  if (csrf) return csrf;
  const ctx = await requireInvestmentContext(req);
  if ("error" in ctx) return ctx.error;
  const { id } = await context.params;

  const row = await withInvestmentWorkspaceRls(ctx, () =>
    getInvestmentActivity(ctx.workspaceId, id),
  );
  if (!row) return notFound();
  return NextResponse.json({ data: row });
}

export async function PATCH(req: Request, context: RouteContext) {
  const csrf = await requireSameOrigin(req);
  if (csrf) return csrf;
  const ctx = await requireInvestmentContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await readJsonBounded(req);
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = investmentActivityUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    const row = await withInvestmentWorkspaceRls(ctx, () =>
      updateInvestmentActivity(ctx.workspaceId, id, parsed.data),
    );
    return NextResponse.json({ data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NOT_FOUND") return notFound();
    return badRequest(msg);
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const csrf = await requireSameOrigin(req);
  if (csrf) return csrf;
  const ctx = await requireInvestmentContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const { id } = await context.params;

  try {
    await withInvestmentWorkspaceRls(ctx, () =>
      deleteInvestmentActivity(ctx.workspaceId, id),
    );
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NOT_FOUND") return notFound();
    return badRequest(msg);
  }
}
