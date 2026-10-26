import { NextResponse } from "next/server";
import { clientSafeErrorMessage } from "@/lib/api-http";
import {
  badRequest,
  rateLimited,
  requireBabyContext,
  withBabyWorkspaceRls,
} from "@/lib/api-baby";
import {
  commitBabyImportAll,
  isBabyImportAllPreview,
} from "@/lib/baby-import-all";
import {
  deleteBabyImportPreview,
  getBabyImportPreview,
  pruneExpiredBabyImportPreviews,
} from "@/lib/baby-import-preview-store";
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
import { z } from "zod";

export const dynamic = "force-dynamic";

const ROUTE_ID = "POST /api/baby/import/all/commit";
const bodySchema = z.object({ previewId: z.string().uuid() });

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

  const ctx = await requireBabyContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const allowed = await enforceRateLimit({
    name: "baby:import:all:commit",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.BABY_IMPORT_COMMIT_RPM ?? 15),
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

  const parsed = bodySchema.safeParse(json);
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

  try {
    await pruneExpiredBabyImportPreviews();
  } catch {
    /* ignore */
  }

  try {
    const result = await withBabyWorkspaceRls(ctx, async () => {
      const rows = await getBabyImportPreview(
        { userSub: ctx.userSub, workspaceId: ctx.workspaceId },
        parsed.data.previewId,
        { skipPrune: true },
      );
      if (!rows?.length) throw new Error("Import preview expired or not found");
      const envelope = rows[0];
      if (!isBabyImportAllPreview(envelope)) {
        throw new Error("Preview is not an Import-all payload");
      }
      const committed = await commitBabyImportAll(
        { userSub: ctx.userSub, workspaceId: ctx.workspaceId },
        envelope,
      );
      await deleteBabyImportPreview(
        { userSub: ctx.userSub, workspaceId: ctx.workspaceId },
        parsed.data.previewId,
        { skipPrune: true },
      );
      return committed;
    });

    const body = {
      committedKinds: result.committedKinds,
      failedKind: result.failedKind ?? null,
      error: result.error ?? null,
    };
    if (claimId) await completeIdempotencyClaim(actor, claimId, 200, body);
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: unknown) {
    await abortIdempotencyClaim(actor, claimId);
    console.error("[baby import all commit]", e);
    return NextResponse.json(
      {
        error: clientSafeErrorMessage(e, "Import failed"),
        code: "bad_request",
      },
      { status: 400 },
    );
  }
}
