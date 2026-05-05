import { parse } from "csv-parse/sync";
import { NextResponse } from "next/server";
import { badRequest, requireMoneyContext } from "@/lib/api-money";

const MAX_CSV_BYTES = 768 * 1024;
const MAX_ROWS = 2000;

const parseBodySchema = (raw: unknown): { csv: string } | null => {
  if (!raw || typeof raw !== "object") return null;
  const csv = (raw as { csv?: unknown }).csv;
  if (typeof csv !== "string") return null;
  return { csv };
};

export async function POST(req: Request) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = parseBodySchema(body);
  if (!parsed) return badRequest("Expected { csv: string }");

  const buf = new TextEncoder().encode(parsed.csv);
  if (buf.length > MAX_CSV_BYTES) {
    return badRequest(`CSV exceeds ${MAX_CSV_BYTES} bytes`);
  }

  let records: Record<string, string>[];
  try {
    records = parse(parsed.csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid CSV";
    return badRequest(msg);
  }

  if (records.length > MAX_ROWS) {
    return badRequest(`CSV has more than ${MAX_ROWS} rows`);
  }

  const headers =
    records.length > 0
      ? Object.keys(records[0]!)
      : (() => {
          try {
            const rows = parse(parsed.csv, {
              columns: false,
              skip_empty_lines: true,
              trim: true,
              to_line: 1,
            }) as string[][];
            return rows[0]?.map(String) ?? [];
          } catch {
            return [];
          }
        })();

  return NextResponse.json({
    data: {
      headers,
      rows: records,
      truncated: false,
    },
  });
}
