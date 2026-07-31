import { parse } from "csv-parse/sync";

const MAX_CSV_BYTES = 768 * 1024;
const MAX_ROWS = 2000;

export function parseMoneyImportCsv(csv: string): {
  headers: string[];
  rows: Record<string, string>[];
  truncated: boolean;
} {
  const buf = new TextEncoder().encode(csv);
  if (buf.length > MAX_CSV_BYTES) {
    throw new Error(`CSV exceeds ${MAX_CSV_BYTES} bytes`);
  }

  let records: Record<string, string>[];
  try {
    records = parse<Record<string, string>>(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid CSV";
    throw new Error(msg);
  }

  if (records.length > MAX_ROWS) {
    throw new Error(`CSV has more than ${MAX_ROWS} rows`);
  }

  const headers =
    records.length > 0
      ? Object.keys(records[0]!)
      : (() => {
          try {
            const rows = parse(csv, {
              columns: false,
              skip_empty_lines: true,
              trim: true,
              to_line: 1,
            });
            return rows[0]?.map(String) ?? [];
          } catch {
            return [];
          }
        })();

  return {
    headers,
    rows: records,
    truncated: false,
  };
}
