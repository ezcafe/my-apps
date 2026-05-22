import { NextResponse } from "next/server";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { validateColumnMapTargets } from "@/lib/money-import-column-map";
import { MAX_IMPORT_BYTES, parseMoneyImportCsv } from "@/lib/money-import-csv";
import { stashImportPreview } from "@/lib/money-import-preview-store";
import { moneyImportTypeSchema } from "@/lib/money-import-types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await requireMoneyContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;

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

  const typeRaw = form.get("type");
  const file = form.get("file");
  const columnMapRaw = form.get("columnMap");

  if (typeof typeRaw !== "string" || !(file instanceof File)) {
    return badRequest("Missing type or file");
  }

  const typeParsed = moneyImportTypeSchema.safeParse(typeRaw);
  if (!typeParsed.success) {
    return badRequest("Invalid import type");
  }

  let columnMap: Record<string, string> | undefined;
  if (typeof columnMapRaw === "string" && columnMapRaw.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(columnMapRaw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return badRequest("columnMap must be a JSON object");
      }
      columnMap = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
          k,
          v == null ? "" : String(v),
        ]),
      );
      const err = validateColumnMapTargets(columnMap, typeParsed.data);
      if (err) return badRequest(err);
    } catch {
      return badRequest("Invalid columnMap JSON");
    }
  }

  let buf: ArrayBuffer;
  try {
    buf = await file.arrayBuffer();
  } catch {
    return badRequest("Could not read file");
  }

  if (buf.byteLength > MAX_IMPORT_BYTES) {
    return badRequest(`File too large (max ${MAX_IMPORT_BYTES} bytes)`);
  }

  const text = new TextDecoder("utf-8").decode(buf);
  const result = parseMoneyImportCsv(text, typeRaw, columnMap);
  if (!result.ok) {
    return badRequest(result.error);
  }

  const previewId = stashImportPreview(ctx, result.preview.rows);

  return NextResponse.json(
    { data: { ...result.preview, previewId } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
