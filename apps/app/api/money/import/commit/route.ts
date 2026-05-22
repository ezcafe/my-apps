import { NextResponse } from "next/server";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { validateRowsForCommit } from "@/lib/money-import-csv";
import { deleteImportPreview, getImportPreview } from "@/lib/money-import-preview-store";
import { importCommitBodySchema } from "@/lib/money-import-types";
import { commitMoneyImport } from "@/lib/money-import";

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

  const parsed = importCommitBodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const { type, previewId, rows } = parsed.data;
  const rowSource = previewId
    ? getImportPreview(ctx, previewId)
    : rows;
  if (previewId && !rowSource) {
    return badRequest(
      "Import preview expired or was discarded. Run Preview again.",
    );
  }
  if (!rowSource) {
    return badRequest("Missing rows");
  }

  const validated = validateRowsForCommit(type, rowSource);
  if (!validated.ok) {
    return badRequest(validated.message);
  }

  try {
    const imported = await commitMoneyImport(ctx, type, validated.rows);
    if (previewId) deleteImportPreview(ctx, previewId);
    return NextResponse.json(
      { data: { imported } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Import failed";
    return badRequest(msg);
  }
}
