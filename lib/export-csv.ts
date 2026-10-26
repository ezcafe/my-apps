/** Shared CSV helpers for feature export routes (buffered, size-capped). */

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(
  headers: string[],
  rows: Record<string, unknown>[],
): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function exportMaxRows(envName: string, fallback: number): number {
  const n = Number(process.env[envName] ?? fallback);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function exportMaxBytes(envName: string, fallback: number): number {
  const n = Number(process.env[envName] ?? fallback);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function exportTooLargeResponse(message?: string): Response {
  return Response.json(
    {
      error:
        message ??
        "Export exceeds the maximum allowed size. Narrow the dataset or raise the export caps.",
      code: "export_too_large",
    },
    { status: 413 },
  );
}
