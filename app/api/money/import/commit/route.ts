import { NextResponse } from "next/server";
import { ClientFacingError, clientSafeErrorMessage } from "@/lib/api-http";
import {
  badRequest,
  rateLimited,
  requireMoneyContext,
  withMoneyWorkspaceRls,
} from "@/lib/api-money";
import { validateRowsForCommit } from "@/lib/money-import-csv";
import {
  deleteImportPreview,
  getImportPreview,
  pruneExpiredImportPreviews,
} from "@/lib/money-import-preview-store";
import { importCommitBodySchema } from "@/lib/money-import-types";
import { commitMoneyImport } from "@/lib/money-import";
import {
  abortIdempotencyClaim,
  beginIdempotencyRequest,
  completeIdempotencyClaim,
} from "@/lib/http-idempotency";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  assertSameOriginStrict,
  readJsonBoundedWithRaw,
} from "@/lib/request-guards";

export const dynamic = "force-dynamic";

const ROUTE_ID = "POST /api/money/import/commit";


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

  const ctx = await requireMoneyContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const allowed = await enforceRateLimit({
    name: "money:import:commit",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.MONEY_IMPORT_COMMIT_RPM ?? 15),
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
  const parsed = importCommitBodySchema.safeParse(json);
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

  const { type, previewId, rows } = parsed.data;

  // Best-effort prune OUTSIDE commit RLS (separate bypass tx OK).
  try {
    await pruneExpiredImportPreviews();
  } catch {
    /* ignore prune failures */
  }

  try {
    const imported = await withMoneyWorkspaceRls(ctx, async () => {
      const rowSource = previewId
        ? await getImportPreview(ctx, previewId, { skipPrune: true })
        : rows;
      if (previewId && !rowSource) {
        throw new ClientFacingError(
          "Import preview expired or was discarded. Run Preview again.",
        );
      }
      if (!rowSource) {
        throw new ClientFacingError("Missing rows");
      }

      const validated = validateRowsForCommit(type, rowSource);
      if (!validated.ok) {
        throw new ClientFacingError(validated.message);
      }

      const count = await commitMoneyImport(ctx, type, validated.rows);
      if (previewId) {
        await deleteImportPreview(ctx, previewId, { skipPrune: true });
      }

      const body = { data: { imported: count } };
      if (claimId) {
        await completeIdempotencyClaim(actor, claimId, 200, body);
      }
      return body;
    });

    return NextResponse.json(imported, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: unknown) {
    await abortIdempotencyClaim(actor, claimId);
    console.error("[money import commit]", e);
    return badRequest(clientSafeErrorMessage(e, "Import failed"));
  }
}
