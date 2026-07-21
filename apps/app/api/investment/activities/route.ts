import { NextResponse } from "next/server";
import {
  badRequest,
  notFound,
  requireInvestmentContext,
  withInvestmentWorkspaceRls,
} from "@/lib/api-investment";
import {
  createInvestmentActivity,
  listInvestmentActivities,
} from "@/lib/investment-services/activities";
import {
  investmentActivitiesQuerySchema,
  investmentActivityCreateSchema,
} from "@/lib/validators/investment";
import { readJsonBounded } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireInvestmentContext(req);
  if ("error" in ctx) return ctx.error;

  const url = new URL(req.url);
  const parsed = investmentActivitiesQuerySchema.safeParse({
    instrumentId: url.searchParams.get("instrumentId") ?? undefined,
    kind: url.searchParams.get("kind") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) return badRequest("Invalid query");

  const data = await withInvestmentWorkspaceRls(ctx, () =>
    listInvestmentActivities(ctx.workspaceId, parsed.data),
  );
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const ctx = await requireInvestmentContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await readJsonBounded(req);
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = investmentActivityCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    const row = await withInvestmentWorkspaceRls(ctx, () =>
      createInvestmentActivity(ctx.workspaceId, parsed.data),
    );
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NOT_FOUND") return notFound();
    return badRequest(msg);
  }
}
