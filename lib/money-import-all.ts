import { parseCsvToKeyedRecords } from "@/lib/feature-csv-rows";
import { executeMoneyCsvImport } from "@/lib/execute-money-csv-import";
import { mapFlatRecordsForMoneyImportKind } from "@/lib/money-import-csv";
import {
  createEmptyMoneyImportIdMaps,
  remapFlatMoneyImportRows,
} from "@/lib/money-import-id-maps";
import {
  isMoneyImportKind,
  MONEY_IMPORT_ALL_ORDER,
  type MoneyImportKind,
} from "@/lib/money-import-kinds";
import { readZip } from "@/lib/export-zip";

export type MoneyImportAllPreviewPayload = {
  mode: "all";
  kinds: Partial<Record<MoneyImportKind, Record<string, string>[]>>;
  warnings: string[];
  presentKinds: MoneyImportKind[];
};

function kindFromZipName(name: string): MoneyImportKind | null {
  const base = name.replace(/^.*\//, "");
  if (!base.endsWith(".csv")) return null;
  const kind = base.slice(0, -4);
  return isMoneyImportKind(kind) ? kind : null;
}

/** Parse Export-all ZIP into per-kind row maps. Unknown filenames reject. */
export function parseMoneyImportAllZip(
  buf: Uint8Array,
):
  | { ok: false; error: string }
  | { ok: true; preview: MoneyImportAllPreviewPayload } {
  let entries;
  try {
    entries = readZip(buf);
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid ZIP",
    };
  }

  const kinds: Partial<Record<MoneyImportKind, Record<string, string>[]>> = {};
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.name.endsWith("/")) continue;
    const kind = kindFromZipName(entry.name);
    if (!kind) {
      return {
        ok: false,
        error: `Unknown ZIP member "${entry.name}". Expected {kind}.csv for Money kinds.`,
      };
    }
    if (seen.has(kind)) {
      return { ok: false, error: `Duplicate ZIP member for kind ${kind}` };
    }
    seen.add(kind);
    const text = new TextDecoder().decode(entry.data);
    try {
      const { records } = parseCsvToKeyedRecords(text);
      kinds[kind] = records;
    } catch {
      return { ok: false, error: `Could not parse CSV for ${kind}` };
    }
  }

  for (const kind of MONEY_IMPORT_ALL_ORDER) {
    if (!seen.has(kind)) {
      warnings.push(`Missing ${kind}.csv — skipping ${kind}`);
    }
  }

  const presentKinds = MONEY_IMPORT_ALL_ORDER.filter((k) => seen.has(k));
  if (presentKinds.length === 0) {
    return { ok: false, error: "ZIP contains no recognized Money kind CSV files" };
  }

  return {
    ok: true,
    preview: { mode: "all", kinds, warnings, presentKinds },
  };
}

export function isMoneyImportAllPreview(
  value: unknown,
): value is MoneyImportAllPreviewPayload {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { mode?: string }).mode === "all" &&
    Array.isArray((value as { presentKinds?: unknown }).presentKinds)
  );
}

type MoneyCtx = { userSub: string; workspaceId: string };

export type MoneyImportAllCommitResult = {
  committedKinds: MoneyImportKind[];
  failedKind?: MoneyImportKind;
  error?: string;
  importedCounts: Partial<Record<MoneyImportKind, number>>;
};

/** Commit kinds in dependency order; stop on first hard-fail; earlier kinds stay. */
export async function commitMoneyImportAll(
  ctx: MoneyCtx,
  preview: MoneyImportAllPreviewPayload,
  commitKind: (
    ctx: MoneyCtx,
    kind: MoneyImportKind,
    rows: unknown[],
    idMaps?: ReturnType<typeof createEmptyMoneyImportIdMaps>,
  ) => Promise<number> = executeMoneyCsvImport,
): Promise<MoneyImportAllCommitResult> {
  const committedKinds: MoneyImportKind[] = [];
  const importedCounts: Partial<Record<MoneyImportKind, number>> = {};
  const idMaps = createEmptyMoneyImportIdMaps();

  for (const kind of MONEY_IMPORT_ALL_ORDER) {
    const rows = preview.kinds[kind];
    if (!rows || rows.length === 0) {
      if (preview.presentKinds.includes(kind) && rows && rows.length === 0) {
        committedKinds.push(kind);
        importedCounts[kind] = 0;
      }
      continue;
    }
    try {
      const remapped = remapFlatMoneyImportRows(kind, rows, idMaps);
      const mapped = mapFlatRecordsForMoneyImportKind(kind, remapped);
      if (!mapped.ok) {
        return {
          committedKinds,
          failedKind: kind,
          error: mapped.message,
          importedCounts,
        };
      }
      const n = await commitKind(ctx, kind, mapped.rows, idMaps);
      committedKinds.push(kind);
      importedCounts[kind] = n;
    } catch (e: unknown) {
      return {
        committedKinds,
        failedKind: kind,
        error: e instanceof Error ? e.message : "Import failed",
        importedCounts,
      };
    }
  }

  return { committedKinds, importedCounts };
}
