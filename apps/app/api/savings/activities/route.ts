import { NextResponse } from "next/server";
import {
  badRequest,
  notFound,
  requireSavingsContext,
  withSavingsWorkspaceRls,
} from "@/lib/api-savings";
import {
  createSavingsActivity,
  listSavingsActivities,
} from "@/lib/savings-services/activities";
import {
  savingsActivitiesQuerySchema,
  savingsActivityCreateSchema,
} from "@/lib/validators/savings";
import { readJsonBounded } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireSavingsContext(req);
  if ("error" in ctx) return ctx.error;

  const url = new URL(req.url);
  const parsed = savingsActivitiesQuerySchema.safeParse({
    accountId: url.searchParams.get("accountId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) return badRequest("Invalid query");

  const data = await withSavingsWorkspaceRls(ctx, () =>
    listSavingsActivities(ctx.workspaceId, parsed.data),
  );
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const ctx = await requireSavingsContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await readJsonBounded(req);
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = savingsActivityCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    const row = await withSavingsWorkspaceRls(ctx, () =>
      createSavingsActivity(ctx.workspaceId, parsed.data),
    );
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NOT_FOUND") return notFound();
    return badRequest(msg);
  }
}
