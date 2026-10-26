import { NextResponse } from "next/server";
import {
  badRequest,
  rateLimited,
  requireLoansContext,
  withLoansWorkspaceRls,
} from "@/lib/api-loans";
import { isLoansImportKind, loansImportFieldDefs } from "@/lib/loans-import-kinds";
import { validateLoansImportRows } from "@/lib/loans-import";
import { stashLoansImportPreview } from "@/lib/loans-import-preview-store";
import {
  assertImportRowCount,
  parseCsvToKeyedRecords,
  projectRowsToKeys,
} from "@/lib/feature-csv-rows";
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

  const ctx = await requireLoansContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const allowed = await enforceRateLimit({
    name: "loans:import:preview",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.LOANS_IMPORT_PREVIEW_RPM ?? 20),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  let body: unknown;
  try {
    body = await readJsonBounded(req);
  } catch {
    return badRequest("Invalid JSON");
  }
  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body");
  }
  const { type, rows, csv } = body as {
    type?: string;
    rows?: unknown[];
    csv?: string;
  };
  if (typeof type !== "string" || !isLoansImportKind(type)) {
    return badRequest("Invalid import type");
  }

  let resolved: unknown[] | null = null;
  if (typeof csv === "string" && csv.trim()) {
    try {
      const { records } = parseCsvToKeyedRecords(csv);
      const keys = loansImportFieldDefs(type).map((d) => d.key);
      resolved = projectRowsToKeys(records, keys);
    } catch (e: unknown) {
      return badRequest(
        e instanceof Error ? e.message : "Invalid CSV",
      );
    }
  } else if (Array.isArray(rows)) {
    resolved = rows;
  } else {
    return badRequest("Provide csv text or a non-empty rows array");
  }

  const countErr = assertImportRowCount(resolved);
  if (countErr) return badRequest(countErr);

  const validated = validateLoansImportRows(type, resolved);
  if (!validated.ok) return badRequest(validated.message);

  const previewId = await withLoansWorkspaceRls(ctx, () =>
    stashLoansImportPreview(ctx, validated.rows),
  );
  return NextResponse.json(
    { data: { previewId, type, rowCount: validated.rows.length } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
