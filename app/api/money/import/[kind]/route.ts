import { NextResponse } from "next/server";
import { badRequest, requireMoneyContext, withMoneyWorkspaceRls } from "@/lib/api-money";
import { executeMoneyCsvImport } from "@/lib/execute-money-csv-import";
import { isMoneyImportKind } from "@/lib/money-import-kinds";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict, readJsonBounded } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ kind: string }> };

async function requireSameOrigin(req: Request): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return null;
  if (!assertSameOriginStrict(req)) {
    return badRequest("Cross-origin request blocked");
  }
  return null;
}

export async function POST(req: Request, ctx: RouteCtx) {
  const csrf = await requireSameOrigin(req);
  if (csrf) return csrf;

  const money = await requireMoneyContext(req, { requireWrite: true });
  if ("error" in money) return money.error;
  const allowed = await enforceRateLimit({
    name: "money:import:legacy",
    request: req,
    userKey: money.userSub,
    points: Number(process.env.MONEY_IMPORT_LEGACY_RPM ?? 10),
    durationSeconds: 60,
  });
  if (!allowed) return new Response("Too many requests", { status: 429 });

  const { kind: kindParam } = await ctx.params;
  if (!isMoneyImportKind(kindParam)) {
    return badRequest("Unknown import kind");
  }

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
  } catch {
    return badRequest("Invalid JSON");
  }

  const rows = (body as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) {
    return badRequest("Expected { rows: unknown[] }");
  }

  try {
    const created = await withMoneyWorkspaceRls(money, () =>
      executeMoneyCsvImport(money, kindParam, rows),
    );
    return NextResponse.json(
      { data: { created } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Import failed";
    return badRequest(msg);
  }
}
