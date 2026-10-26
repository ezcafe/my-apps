import { NextResponse } from "next/server";
import { ClientFacingError, clientSafeErrorMessage } from "@/lib/api-http";
import {
  badRequest,
  rateLimited,
  requireLoansContext,
  withLoansWorkspaceRls,
} from "@/lib/api-loans";
import {
  commitLoansImport,
  validateLoansImportCommitBody,
} from "@/lib/loans-import";
import {
  deleteLoansImportPreview,
  getLoansImportPreview,
  pruneExpiredLoansImportPreviews,
} from "@/lib/loans-import-preview-store";
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

const ROUTE_ID = "POST /api/loans/import/commit";

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

  const ctx = await requireLoansContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const allowed = await enforceRateLimit({
    name: "loans:import:commit",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.LOANS_IMPORT_COMMIT_RPM ?? 15),
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

  const parsed = validateLoansImportCommitBody(
    (json ?? {}) as { type?: unknown; previewId?: unknown; rows?: unknown },
  );
  if (!parsed.ok) {
    return badRequest(parsed.message);
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

  try {
    await pruneExpiredLoansImportPreviews();
  } catch {
    /* ignore prune failures */
  }

  try {
    const imported = await withLoansWorkspaceRls(ctx, async () => {
      const rowSource = await getLoansImportPreview(ctx, parsed.previewId, {
        skipPrune: true,
      });
      if (!rowSource) {
        throw new ClientFacingError(
          "Import preview expired or was discarded. Run Preview again.",
        );
      }

      const count = await commitLoansImport(
        ctx,
        parsed.type,
        rowSource as Record<string, unknown>[],
      );
      await deleteLoansImportPreview(ctx, parsed.previewId, { skipPrune: true });

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
    console.error("[loans import commit]", e);
    return badRequest(clientSafeErrorMessage(e, "Import failed"));
  }
}
