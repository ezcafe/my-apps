import { NextResponse } from "next/server";
import { badRequest, requireMoneyContext, withMoneyWorkspaceRls } from "@/lib/api-money";
import { deleteImportPreview } from "@/lib/money-import-preview-store";
import { importAbandonBodySchema } from "@/lib/money-import-types";
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

  const ctx = await requireMoneyContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const allowed = await enforceRateLimit({
    name: "money:import:abandon",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.MONEY_IMPORT_ABANDON_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return new Response("Too many requests", { status: 429 });

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = importAbandonBodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  await withMoneyWorkspaceRls(ctx, () =>
    deleteImportPreview(ctx, parsed.data.previewId),
  );

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
