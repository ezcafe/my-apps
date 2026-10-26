/**
 * Shared CSV → row records for Baby/Loans import (headers match field-def keys).
 */
import { parse } from "csv-parse/sync";

export const FEATURE_IMPORT_MAX_ROWS = 50_000;
const MAX_RECORD_BYTES = 16 * 1024;

export function parseCsvToKeyedRecords(text: string): {
  headers: string[];
  records: Record<string, string>[];
} {
  const all = parse(text, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: false,
    max_record_size: MAX_RECORD_BYTES,
  }) as string[][];
  if (all.length > FEATURE_IMPORT_MAX_ROWS + 1) {
    throw new Error(`CSV has more than ${FEATURE_IMPORT_MAX_ROWS} rows`);
  }
  if (!all.length) return { headers: [], records: [] };
  const headers = all[0]!.map((h, i) => {
    const t = String(h ?? "").trim();
    return t || `column_${i + 1}`;
  });
  const records = all.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]!] = String(cells[i] ?? "").trim();
    }
    return row;
  });
  return { headers, records };
}

/** Keep only known field keys; drop empty optional cells as "". */
export function projectRowsToKeys(
  records: Record<string, string>[],
  keys: string[],
): Record<string, unknown>[] {
  return records.map((rec) => {
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      out[key] = rec[key] ?? "";
    }
    return out;
  });
}

export function assertImportRowCount(
  rows: unknown[],
  max = FEATURE_IMPORT_MAX_ROWS,
): string | null {
  if (rows.length === 0) return "rows must be a non-empty array";
  if (rows.length > max) {
    return `Too many rows (max ${max})`;
  }
  return null;
}
