import { NextResponse } from "next/server";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { deleteImportPreview } from "@/lib/money-import-preview-store";
import { importAbandonBodySchema } from "@/lib/money-import-types";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, readJsonBounded } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
  if (!assertSameOrigin(req)) return badRequest("Cross-origin request blocked");

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

  deleteImportPreview(ctx, parsed.data.previewId);

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
