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
  abortIdempotencyClaim,
  beginIdempotencyRequest,
  completeIdempotencyClaim,
} from "@/lib/http-idempotency";
import {
  createInvestmentActivity,
  listInvestmentActivities,
} from "@/lib/investment-services/activities";
import {
  investmentActivitiesQuerySchema,
  investmentActivityCreateSchema,
} from "@/lib/validators/investment";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  assertSameOriginStrict,
  readJsonBoundedWithRaw,
} from "@/lib/request-guards";

export const dynamic = "force-dynamic";

const ROUTE_ID = "POST /api/investment/activities";

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

  let json: unknown;
  let rawText: string;
  try {
    ({ json, rawText } = await readJsonBoundedWithRaw(
      req,
      Number(process.env.JSON_MAX_BYTES ?? 262144),
    ));
  } catch {
    return badRequest("Invalid JSON");
  }

  // Validate before claim so bad bodies never INSERT http_idempotency rows.
  const parsed = investmentActivityCreateSchema.safeParse(json);
  if (!parsed.success) return zodBadRequest(parsed);

  const actor = {
    workspaceId: ctx.workspaceId,
    userSub: ctx.userSub,
    route: ROUTE_ID,
  };

  const began = await beginIdempotencyRequest({
    actor,
    keyHeader: req.headers.get("Idempotency-Key"),
    rawBody: rawText,
  });
  if (began.kind === "response") return began.response;
  const claimId = began.claimId;

  try {
    const body = await withInvestmentWorkspaceRls(ctx, async () => {
      const row = await createInvestmentActivity(
        ctx.workspaceId,
        ctx.userSub,
        parsed.data,
      );
      const payload = { data: row };
      if (claimId) {
        await completeIdempotencyClaim(actor, claimId, 201, payload);
      }
      return payload;
    });
    return NextResponse.json(body, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    await abortIdempotencyClaim(actor, claimId);
    console.error("[investment activities POST]", e);
    if (e instanceof Error && e.message === "NOT_FOUND") return notFound();
    return badRequest(clientSafeErrorMessage(e, "Request failed"));
  }
}
