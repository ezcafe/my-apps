import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  babyCareEvent,
  babyGrowthEntry,
  babyProfile,
  babyVaccineEntry,
} from "@/db/schema/baby";
import {
  BABY_IMPORT_ALL_ORDER,
  babyImportFieldDefs,
  isBabyImportKind,
  type BabyImportKind,
} from "@/lib/baby-import-kinds";
import {
  csvResponse,
  exportMaxBytes,
  exportMaxRows,
  exportTooLargeResponse,
  rowsToCsv,
} from "@/lib/export-csv";
import { buildZip, zipResponse } from "@/lib/export-zip";

/** Export kinds mirror import kinds. Never includes telegram or quick-care. */
export const BABY_EXPORT_KINDS = [
  "profile",
  "care",
  "growth",
  "vaccines",
] as const satisfies readonly BabyImportKind[];

export const BABY_EXPORT_MAX_ROWS = exportMaxRows(
  "BABY_EXPORT_MAX_ROWS",
  100_000,
);
export const BABY_EXPORT_MAX_BYTES = exportMaxBytes(
  "BABY_EXPORT_MAX_BYTES",
  5_242_880,
);

export function babyExportCsv(
  kind: BabyImportKind,
  rows: Record<string, unknown>[],
): string {
  const headers = babyImportFieldDefs(kind).map((d) => d.key);
  const normalized = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const h of headers) out[h] = row[h] ?? "";
    return out;
  });
  return rowsToCsv(headers, normalized);
}

function buildResponse(kind: BabyImportKind, rows: Record<string, unknown>[]) {
  if (rows.length > BABY_EXPORT_MAX_ROWS) {
    return exportTooLargeResponse(
      `Export exceeds max rows (${BABY_EXPORT_MAX_ROWS}).`,
    );
  }
  const csv = babyExportCsv(kind, rows);
  const bytes = new TextEncoder().encode(csv).byteLength;
  if (bytes > BABY_EXPORT_MAX_BYTES) {
    return exportTooLargeResponse(
      `Export exceeds max bytes (${BABY_EXPORT_MAX_BYTES}).`,
    );
  }
  return csvResponse(`baby-${kind}.csv`, csv);
}

async function loadRows(
  workspaceId: string,
  kind: BabyImportKind,
): Promise<Record<string, unknown>[]> {
  const limit = BABY_EXPORT_MAX_ROWS + 1;
  switch (kind) {
    case "profile": {
      const rows = await db
        .select({
          displayName: babyProfile.displayName,
          birthDate: babyProfile.birthDate,
        })
        .from(babyProfile)
        .where(eq(babyProfile.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => ({
        displayName: r.displayName,
        birthDate: r.birthDate ?? "",
      }));
    }
    case "care": {
      const rows = await db
        .select({
          type: babyCareEvent.type,
          occurredAt: babyCareEvent.occurredAt,
          endedAt: babyCareEvent.endedAt,
          payload: babyCareEvent.payload,
        })
        .from(babyCareEvent)
        .where(eq(babyCareEvent.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => ({
        type: r.type,
        occurredAt:
          r.occurredAt instanceof Date
            ? r.occurredAt.toISOString()
            : String(r.occurredAt ?? ""),
        endedAt:
          r.endedAt instanceof Date
            ? r.endedAt.toISOString()
            : (r.endedAt ?? ""),
        payloadJson: JSON.stringify(r.payload ?? {}),
      }));
    }
    case "growth": {
      const rows = await db
        .select({
          kind: babyGrowthEntry.kind,
          recordedAt: babyGrowthEntry.recordedAt,
          valueNum: babyGrowthEntry.valueNum,
          valueText: babyGrowthEntry.valueText,
          unit: babyGrowthEntry.unit,
          notes: babyGrowthEntry.notes,
        })
        .from(babyGrowthEntry)
        .where(eq(babyGrowthEntry.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => ({
        kind: r.kind,
        occurredAt:
          r.recordedAt instanceof Date
            ? r.recordedAt.toISOString()
            : String(r.recordedAt ?? ""),
        value: r.valueNum ?? r.valueText ?? "",
        unit: r.unit ?? "",
        notes: r.notes ?? "",
      }));
    }
    case "vaccines": {
      const rows = await db
        .select({
          name: babyVaccineEntry.name,
          dose: babyVaccineEntry.dose,
          administeredAt: babyVaccineEntry.administeredAt,
          notes: babyVaccineEntry.notes,
        })
        .from(babyVaccineEntry)
        .where(eq(babyVaccineEntry.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => ({
        name: r.name,
        dose: r.dose ?? "",
        scheduledAt: "",
        givenAt:
          r.administeredAt instanceof Date
            ? r.administeredAt.toISOString()
            : String(r.administeredAt ?? ""),
        notes: r.notes ?? "",
      }));
    }
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

export async function exportBabyKindCsv(
  workspaceId: string,
  kindParam: string,
): Promise<Response> {
  if (!isBabyImportKind(kindParam)) {
    return Response.json(
      { error: "Unknown export kind", code: "bad_request" },
      { status: 400 },
    );
  }
  const rows = await loadRows(workspaceId, kindParam);
  return buildResponse(kindParam, rows);
}

export async function exportBabyAllZip(workspaceId: string): Promise<Response> {
  const encoder = new TextEncoder();
  const zipEntries: { name: string; data: Uint8Array }[] = [];
  for (const kind of BABY_IMPORT_ALL_ORDER) {
    const rows = await loadRows(workspaceId, kind);
    if (rows.length > BABY_EXPORT_MAX_ROWS) {
      return exportTooLargeResponse(
        `Export exceeds max rows (${BABY_EXPORT_MAX_ROWS}) for ${kind}.`,
      );
    }
    const csv = babyExportCsv(kind, rows);
    const bytes = encoder.encode(csv).byteLength;
    if (bytes > BABY_EXPORT_MAX_BYTES) {
      return exportTooLargeResponse(
        `Export exceeds max bytes (${BABY_EXPORT_MAX_BYTES}) for ${kind}.`,
      );
    }
    zipEntries.push({ name: `${kind}.csv`, data: encoder.encode(csv) });
  }
  return zipResponse("baby-export-all.zip", buildZip(zipEntries));
}
