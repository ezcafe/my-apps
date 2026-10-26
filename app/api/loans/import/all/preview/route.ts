import { NextResponse } from "next/server";
import {
  badRequest,
  requireLoansContext,
  withLoansWorkspaceRls,
} from "@/lib/api-loans";
import { parseLoansImportAllZip } from "@/lib/loans-import-all";
import { stashLoansImportPreview } from "@/lib/loans-import-preview-store";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

const MAX_ZIP_BYTES = Number(process.env.LOANS_IMPORT_ALL_MAX_BYTES ?? 10_485_760);

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
    name: "loans:import:all:preview",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.LOANS_IMPORT_PREVIEW_RPM ?? 20),
    durationSeconds: 60,
  });
  if (!allowed) return new Response("Too many requests", { status: 429 });

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return badRequest("Expected multipart form data");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("Invalid form data");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("Missing file");
  if (file.size > MAX_ZIP_BYTES) {
    return badRequest(`ZIP exceeds max bytes (${MAX_ZIP_BYTES})`);
  }

  const parsed = parseLoansImportAllZip(new Uint8Array(await file.arrayBuffer()));
  if (!parsed.ok) return badRequest(parsed.error);

  const previewId = await withLoansWorkspaceRls(ctx, () =>
    stashLoansImportPreview(
      { userSub: ctx.userSub, workspaceId: ctx.workspaceId },
      [parsed.preview],
    ),
  );

  return NextResponse.json({
    previewId,
    warnings: parsed.preview.warnings,
    presentKinds: parsed.preview.presentKinds,
    counts: Object.fromEntries(
      parsed.preview.presentKinds.map((k) => [
        k,
        parsed.preview.kinds[k]?.length ?? 0,
      ]),
    ),
  });
}
