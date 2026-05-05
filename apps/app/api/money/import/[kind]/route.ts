import { NextResponse } from "next/server";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { executeMoneyCsvImport } from "@/lib/execute-money-csv-import";
import { isMoneyImportKind } from "@/lib/money-import-kinds";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ kind: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const money = await requireMoneyContext();
  if ("error" in money) return money.error;

  const { kind: kindParam } = await ctx.params;
  if (!isMoneyImportKind(kindParam)) {
    return badRequest("Unknown import kind");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const rows = (body as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) {
    return badRequest("Expected { rows: unknown[] }");
  }

  try {
    const created = await executeMoneyCsvImport(money, kindParam, rows);
    return NextResponse.json(
      { data: { created } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Import failed";
    return badRequest(msg);
  }
}
