import { NextResponse } from "next/server";
import { badRequest, requireMoneyContext, withMoneyWorkspaceRls } from "@/lib/api-money";
import { validateRowsForCommit } from "@/lib/money-import-csv";
import { deleteImportPreview, getImportPreview } from "@/lib/money-import-preview-store";
import { importCommitBodySchema } from "@/lib/money-import-types";
import { commitMoneyImport } from "@/lib/money-import";
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
    name: "money:import:commit",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.MONEY_IMPORT_COMMIT_RPM ?? 15),
    durationSeconds: 60,
  });
  if (!allowed) return new Response("Too many requests", { status: 429 });

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
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
  const rowSource = await withMoneyWorkspaceRls(ctx, async () =>
    previewId ? getImportPreview(ctx, previewId) : rows,
  );
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
    const imported = await withMoneyWorkspaceRls(ctx, () =>
      commitMoneyImport(ctx, type, validated.rows),
    );
    if (previewId) {
      await withMoneyWorkspaceRls(ctx, () =>
        deleteImportPreview(ctx, previewId),
      );
    }
    return NextResponse.json(
      { data: { imported } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Import failed";
    return badRequest(msg);
  }
}
