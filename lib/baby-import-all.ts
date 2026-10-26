import { parseCsvToKeyedRecords } from "@/lib/feature-csv-rows";
import { commitBabyImport } from "@/lib/baby-import";
import {
  BABY_IMPORT_ALL_ORDER,
  isBabyImportKind,
  type BabyImportKind,
} from "@/lib/baby-import-kinds";
import { readZip } from "@/lib/export-zip";

export type BabyImportAllPreviewPayload = {
  mode: "all";
  kinds: Partial<Record<BabyImportKind, Record<string, string>[]>>;
  warnings: string[];
  presentKinds: BabyImportKind[];
};

function kindFromZipName(name: string): BabyImportKind | null {
  const base = name.replace(/^.*\//, "");
  if (!base.endsWith(".csv")) return null;
  const kind = base.slice(0, -4);
  return isBabyImportKind(kind) ? kind : null;
}

export function parseBabyImportAllZip(
  buf: Uint8Array,
):
  | { ok: false; error: string }
  | { ok: true; preview: BabyImportAllPreviewPayload } {
  let entries;
  try {
    entries = readZip(buf);
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid ZIP",
    };
  }

  const kinds: Partial<Record<BabyImportKind, Record<string, string>[]>> = {};
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.name.endsWith("/")) continue;
    const kind = kindFromZipName(entry.name);
    if (!kind) {
      return {
        ok: false,
        error: `Unknown ZIP member "${entry.name}". Expected {kind}.csv for Baby kinds.`,
      };
    }
    if (seen.has(kind)) {
      return { ok: false, error: `Duplicate ZIP member for kind ${kind}` };
    }
    seen.add(kind);
    try {
      const { records } = parseCsvToKeyedRecords(
        new TextDecoder().decode(entry.data),
      );
      kinds[kind] = records;
    } catch {
      return { ok: false, error: `Could not parse CSV for ${kind}` };
    }
  }

  for (const kind of BABY_IMPORT_ALL_ORDER) {
    if (!seen.has(kind)) warnings.push(`Missing ${kind}.csv — skipping ${kind}`);
  }

  const presentKinds = BABY_IMPORT_ALL_ORDER.filter((k) => seen.has(k));
  if (presentKinds.length === 0) {
    return { ok: false, error: "ZIP contains no recognized Baby kind CSV files" };
  }

  return {
    ok: true,
    preview: { mode: "all", kinds, warnings, presentKinds },
  };
}

export function isBabyImportAllPreview(
  value: unknown,
): value is BabyImportAllPreviewPayload {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { mode?: string }).mode === "all" &&
    Array.isArray((value as { presentKinds?: unknown }).presentKinds)
  );
}

export async function commitBabyImportAll(
  ctx: { userSub: string; workspaceId: string },
  preview: BabyImportAllPreviewPayload,
): Promise<{
  committedKinds: BabyImportKind[];
  failedKind?: BabyImportKind;
  error?: string;
}> {
  const committedKinds: BabyImportKind[] = [];
  for (const kind of BABY_IMPORT_ALL_ORDER) {
    const rows = preview.kinds[kind];
    if (!rows) continue;
    try {
      await commitBabyImport(ctx, kind, rows);
      committedKinds.push(kind);
    } catch (e: unknown) {
      return {
        committedKinds,
        failedKind: kind,
        error: e instanceof Error ? e.message : "Import failed",
      };
    }
  }
  return { committedKinds };
}
