import { NextResponse } from "next/server";
import {
  badRequest,
  rateLimited,
  requireBabyContext,
  withBabyWorkspaceRls,
} from "@/lib/api-baby";
import { deleteBabyImportPreview } from "@/lib/baby-import-preview-store";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict, readJsonBounded } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

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
    name: "baby:import:abandon",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.BABY_IMPORT_ABANDON_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  let body: unknown;
  try {
    body = await readJsonBounded(req);
  } catch {
    return badRequest("Invalid JSON");
  }
  const previewId =
    body && typeof body === "object"
      ? (body as { previewId?: unknown }).previewId
      : undefined;
  if (typeof previewId !== "string" || !previewId.trim()) {
    return badRequest("previewId is required");
  }

  await withBabyWorkspaceRls(ctx, () =>
    deleteBabyImportPreview(ctx, previewId.trim()),
  );

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
