import { NextResponse } from "next/server";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { deleteImportPreview } from "@/lib/money-import-preview-store";
import { importAbandonBodySchema } from "@/lib/money-import-types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await requireMoneyContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
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
