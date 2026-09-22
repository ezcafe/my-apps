import { NextResponse } from "next/server";
import { clientSafeErrorMessage } from "@/lib/api-http";
import {
  badRequest,
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
  commitInvestmentStatement,
  type CommitInvestmentStatementInput,
} from "@/lib/investment-services/import-statement";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  assertSameOriginStrict,
  readJsonBoundedWithRaw,
} from "@/lib/request-guards";
import { investmentImportCommitBodySchema } from "@/lib/validators/investment";

export const dynamic = "force-dynamic";

const ROUTE_ID = "POST /api/investment/import/commit";

async function requireSameOrigin(req: Request): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return null;
  if (!assertSameOriginStrict(req)) {
    return badRequest("Cross-origin request blocked");
  }
  return null;
}

export async function POST(req: Request) {
  const csrf = await requireSameOrigin(req);
  if (csrf) return csrf;

  const ctx = await requireInvestmentContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;

  const allowed = await enforceRateLimit({
    name: "investment:import:commit",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.INVESTMENT_IMPORT_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  let json: unknown;
  let rawText: string;
  try {
    ({ json, rawText } = await readJsonBoundedWithRaw(req));
  } catch {
    return badRequest("Invalid JSON");
  }

  // Validate before claim so bad bodies never INSERT http_idempotency rows.
  const parsed = investmentImportCommitBodySchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

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

  const payload = parsed.data as CommitInvestmentStatementInput;

  try {
    const body = await withInvestmentWorkspaceRls(ctx, async () => {
      const result = await commitInvestmentStatement(
        ctx.workspaceId,
        ctx.userSub,
        payload,
      );
      // Counts only — safe for replay store (no trade/position payloads).
      const responseBody = { data: result };
      if (claimId) {
        await completeIdempotencyClaim(actor, claimId, 200, responseBody);
      }
      return responseBody;
    });
    return NextResponse.json(body);
  } catch (err: unknown) {
    await abortIdempotencyClaim(actor, claimId);
    console.error("[investment import commit]", err);
    return badRequest(clientSafeErrorMessage(err, "Import failed"));
  }
}
