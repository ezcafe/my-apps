import { NextResponse } from "next/server";
import { clientSafeErrorMessage } from "@/lib/api-http";
import {
  badRequest,
  notFound,
  rateLimited,
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
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJsonBounded, assertSameOriginStrict } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

async function requireSameOrigin(req: Request): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return null;
  if (!assertSameOriginStrict(req)) {
    return badRequest("Cross-origin request blocked");
  }
  return null;
}

function zodBadRequest(parsed: {
  error: { issues: { message: string }[]; flatten: () => unknown };
}) {
  const message =
    parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed";
  return badRequest(message, parsed.error.flatten());
}

export async function GET(req: Request) {
  const csrf = await requireSameOrigin(req);
  if (csrf) return csrf;
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
  if (!parsed.success) return zodBadRequest(parsed);

  const data = await withInvestmentWorkspaceRls(ctx, () =>
    listInvestmentActivities(ctx.workspaceId, parsed.data),
  );
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const csrf = await requireSameOrigin(req);
  if (csrf) return csrf;
  const ctx = await requireInvestmentContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;

  const allowed = await enforceRateLimit({
    name: "investment:activities",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.INVESTMENT_ACTIVITIES_RPM ?? 60),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  let body: unknown;
  try {
    body = await readJsonBounded(req);
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = investmentActivityCreateSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed);

  try {
    const row = await withInvestmentWorkspaceRls(ctx, () =>
      createInvestmentActivity(ctx.workspaceId, ctx.userSub, parsed.data),
    );
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    console.error("[investment activities POST]", e);
    if (e instanceof Error && e.message === "NOT_FOUND") return notFound();
    return badRequest(clientSafeErrorMessage(e, "Request failed"));
  }
}
