import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  babyCareEvent,
  babyGrowthEntry,
  babyProfile,
  babyVaccineEntry,
  type BabyCarePayload,
} from "@/db/schema/baby";
import { ClientFacingError } from "@/lib/api-http";
import {
  babyImportFieldDefs,
  isBabyImportKind,
  type BabyImportKind,
} from "@/lib/baby-import-kinds";
import { assertImportRowCount } from "@/lib/feature-csv-rows";

export type BabyImportCommitBody = {
  type?: unknown;
  previewId?: unknown;
  rows?: unknown;
};

const CARE_TYPES = new Set(["feed", "diaper", "sleep"]);
const GROWTH_KINDS = new Set([
  "weight",
  "height",
  "head",
  "temperature",
  "medication",
  "vitamin",
  "pump",
]);

export function validateBabyImportCommitBody(
  body: BabyImportCommitBody,
):
  | { ok: true; type: BabyImportKind; previewId: string }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid body" };
  }
  if (typeof body.type !== "string" || !isBabyImportKind(body.type)) {
    return { ok: false, message: "Unknown import type" };
  }
  if (typeof body.previewId !== "string" || !body.previewId.trim()) {
    return { ok: false, message: "previewId is required — run Preview first" };
  }
  return { ok: true, type: body.type, previewId: body.previewId.trim() };
}

export function validateBabyImportRows(
  kind: BabyImportKind,
  rows: unknown[],
): { ok: true; rows: Record<string, unknown>[] } | { ok: false; message: string } {
  const countErr = assertImportRowCount(rows);
  if (countErr) return { ok: false, message: countErr };

  const defs = babyImportFieldDefs(kind);
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, message: `Row ${i + 1}: expected an object` };
    }
    const row = raw as Record<string, unknown>;
    for (const def of defs) {
      if (!def.required) continue;
      const v = row[def.key];
      if (v === undefined || v === null || String(v).trim() === "") {
        return {
          ok: false,
          message: `Row ${i + 1}: ${def.key} is required`,
        };
      }
    }
    if (kind === "care") {
      const type = String(row.type ?? "").trim();
      if (!CARE_TYPES.has(type)) {
        return {
          ok: false,
          message: `Row ${i + 1}: type must be feed, diaper, or sleep`,
        };
      }
      if (typeof row.payloadJson === "string" && row.payloadJson.trim()) {
        try {
          JSON.parse(row.payloadJson);
        } catch {
          return {
            ok: false,
            message: `Row ${i + 1}: payloadJson must be valid JSON`,
          };
        }
      }
    }
    if (kind === "growth") {
      const gKind = String(row.kind ?? "").trim();
      if (!GROWTH_KINDS.has(gKind)) {
        return {
          ok: false,
          message: `Row ${i + 1}: kind must be a known growth kind`,
        };
      }
    }
    if (kind === "vaccines") {
      const dose = String(row.dose ?? "first").trim() || "first";
      if (dose !== "first" && dose !== "second") {
        return {
          ok: false,
          message: `Row ${i + 1}: dose must be first or second`,
        };
      }
    }
    const projected: Record<string, unknown> = {};
    for (const def of defs) {
      projected[def.key] = row[def.key] ?? "";
    }
    out.push(projected);
  }
  return { ok: true, rows: out };
}

export type BabyImportAdapters = {
  upsertProfile: (
    row: Record<string, unknown>,
  ) => Promise<"upsert" | "insert">;
  appendCare: (row: Record<string, unknown>) => Promise<"append">;
  appendGrowth?: (row: Record<string, unknown>) => Promise<"append">;
  appendVaccine?: (row: Record<string, unknown>) => Promise<"append">;
};

/** Pure merge policy helper — used by unit tests and commit path. */
export async function applyBabyImportRows(
  ctx: { workspaceId: string },
  kind: BabyImportKind,
  rows: Record<string, unknown>[],
  adapters: BabyImportAdapters,
): Promise<number> {
  void ctx;
  let count = 0;
  for (const row of rows) {
    switch (kind) {
      case "profile":
        await adapters.upsertProfile(row);
        count += 1;
        break;
      case "care":
        await adapters.appendCare(row);
        count += 1;
        break;
      case "growth":
        await (adapters.appendGrowth ?? adapters.appendCare)(row);
        count += 1;
        break;
      case "vaccines":
        await (adapters.appendVaccine ?? adapters.appendCare)(row);
        count += 1;
        break;
      default: {
        const _x: never = kind;
        return _x;
      }
    }
  }
  return count;
}

async function ensureBabyId(workspaceId: string): Promise<string> {
  const existing = await db
    .select({ id: babyProfile.id })
    .from(babyProfile)
    .where(eq(babyProfile.workspaceId, workspaceId))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(babyProfile)
    .values({ workspaceId, displayName: "Baby" })
    .returning({ id: babyProfile.id });
  return inserted[0]!.id;
}

export async function commitBabyImport(
  ctx: { workspaceId: string; userSub: string },
  kind: BabyImportKind,
  rows: Record<string, unknown>[],
): Promise<number> {
  const validated = validateBabyImportRows(kind, rows);
  if (!validated.ok) {
    throw new ClientFacingError(validated.message);
  }
  return applyBabyImportRows(ctx, kind, validated.rows, {
    upsertProfile: async (row) => {
      const displayName =
        typeof row.displayName === "string" && row.displayName.trim()
          ? row.displayName.trim()
          : "Baby";
      const birthDate =
        row.birthDate === null || row.birthDate === undefined || row.birthDate === ""
          ? null
          : String(row.birthDate);
      const existing = await db
        .select({ id: babyProfile.id })
        .from(babyProfile)
        .where(eq(babyProfile.workspaceId, ctx.workspaceId))
        .limit(1);
      if (existing[0]) {
        await db
          .update(babyProfile)
          .set({
            displayName,
            birthDate,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(babyProfile.id, existing[0].id),
              eq(babyProfile.workspaceId, ctx.workspaceId),
            ),
          );
        return "upsert";
      }
      await db.insert(babyProfile).values({
        workspaceId: ctx.workspaceId,
        displayName,
        birthDate,
      });
      return "insert";
    },
    appendCare: async (row) => {
      const babyId = await ensureBabyId(ctx.workspaceId);
      let payload: BabyCarePayload = {};
      if (typeof row.payloadJson === "string" && row.payloadJson.trim()) {
        try {
          payload = JSON.parse(row.payloadJson) as BabyCarePayload;
        } catch {
          payload = {};
        }
      }
      const type = String(row.type ?? "feed") as "feed" | "diaper" | "sleep";
      await db.insert(babyCareEvent).values({
        workspaceId: ctx.workspaceId,
        babyId,
        type,
        occurredAt: new Date(String(row.occurredAt ?? new Date().toISOString())),
        endedAt: row.endedAt ? new Date(String(row.endedAt)) : null,
        payload,
        createdByUserSub: ctx.userSub,
        updatedByUserSub: ctx.userSub,
      });
      return "append";
    },
    appendGrowth: async (row) => {
      const babyId = await ensureBabyId(ctx.workspaceId);
      await db.insert(babyGrowthEntry).values({
        workspaceId: ctx.workspaceId,
        babyId,
        kind: String(row.kind ?? "weight") as
          | "weight"
          | "height"
          | "head"
          | "temperature"
          | "medication"
          | "vitamin"
          | "pump",
        recordedAt: new Date(String(row.occurredAt ?? new Date().toISOString())),
        valueNum:
          row.value !== undefined && row.value !== ""
            ? String(row.value)
            : null,
        unit: row.unit ? String(row.unit) : null,
        notes: row.notes ? String(row.notes) : null,
        createdByUserSub: ctx.userSub,
        updatedByUserSub: ctx.userSub,
      });
      return "append";
    },
    appendVaccine: async (row) => {
      const babyId = await ensureBabyId(ctx.workspaceId);
      const dose = String(row.dose ?? "first") === "second" ? "second" : "first";
      await db.insert(babyVaccineEntry).values({
        workspaceId: ctx.workspaceId,
        babyId,
        name: String(row.name ?? "Vaccine"),
        dose,
        administeredAt: new Date(
          String(row.givenAt || row.scheduledAt || new Date().toISOString()),
        ),
        notes: row.notes ? String(row.notes) : null,
        createdByUserSub: ctx.userSub,
        updatedByUserSub: ctx.userSub,
      });
      return "append";
    },
  });
}
