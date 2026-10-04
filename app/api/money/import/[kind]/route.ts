import { NextResponse } from "next/server";
import { clientSafeErrorMessage } from "@/lib/api-http";
import {
  badRequest,
  rateLimited,
  requireMoneyContext,
  withMoneyWorkspaceRls,
} from "@/lib/api-money";
import { executeMoneyCsvImport } from "@/lib/execute-money-csv-import";
import {
  abortIdempotencyClaim,
  beginIdempotencyRequest,
  completeIdempotencyClaim,
} from "@/lib/http-idempotency";
import { isMoneyImportKind } from "@/lib/money-import-kinds";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  assertSameOriginStrict,
  readJsonBoundedWithRaw,
} from "@/lib/request-guards";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ kind: string }> };

async function requireSameOrigin(req: Request): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return null;
  if (!assertSameOriginStrict(req)) {
    return badRequest("Cross-origin request blocked");
  }
  return null;
}

export async function POST(req: Request, ctx: RouteCtx) {
  const csrf = await requireSameOrigin(req);
  if (csrf) return csrf;

  const money = await requireMoneyContext(req, { requireWrite: true });
  if ("error" in money) return money.error;
  const allowed = await enforceRateLimit({
    name: "money:import:legacy",
    request: req,
    userKey: money.userSub,
    points: Number(process.env.MONEY_IMPORT_LEGACY_RPM ?? 10),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  const { kind: kindParam } = await ctx.params;
  if (!isMoneyImportKind(kindParam)) {
    return badRequest("Unknown import kind");
  }

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

  const rows = (json as { rows?: unknown })?.rows;
  if (!Array.isArray(rows)) {
    return badRequest("Expected { rows: unknown[] }");
  }

  const actor = {
    workspaceId: money.workspaceId,
    userSub: money.userSub,
    route: `POST /api/money/import/${kindParam}`,
  };

  const began = await beginIdempotencyRequest({
    actor,
    keyHeader: req.headers.get("Idempotency-Key"),
    rawBody: rawText,
  });
  if (began.kind === "response") return began.response;
  const claimId = began.claimId;

  try {
    const body = await withMoneyWorkspaceRls(money, async () => {
      const created = await executeMoneyCsvImport(money, kindParam, rows);
      const responseBody = { data: { created } };
      if (claimId) {
        await completeIdempotencyClaim(actor, claimId, 200, responseBody);
      }
      return responseBody;
    });

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: unknown) {
    await abortIdempotencyClaim(actor, claimId);
    console.error("[money import kind]", e);
    return badRequest(clientSafeErrorMessage(e, "Import failed"));
  }
}
