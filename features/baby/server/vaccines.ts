import { and, desc, eq, gte, lt, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { babyVaccineEntry } from "@/db/schema/baby";
import { ensureBabyProfile } from "@/features/baby/server/profile";
import {
  decodeBabyTimelineCursor,
  encodeBabyTimelineCursor,
} from "@/features/baby/server/timeline";
import { parseOrThrow } from "@/lib/parse-or-throw";
import {
  babyVaccineListInputSchema,
  createBabyVaccineSchema,
  updateBabyVaccineSchema,
  type CreateBabyVaccineInput,
} from "@/lib/validators/baby";

export const encodeBabyVaccineCursor = encodeBabyTimelineCursor;
export const decodeBabyVaccineCursor = decodeBabyTimelineCursor;

export type BabyVaccineRow = {
  id: string;
  workspaceId: string;
  babyId: string;
  name: string;
  dose: "first" | "second";
  administeredAt: Date;
  notes: string | null;
  source: "web" | "telegram";
  createdByUserSub: string;
  updatedByUserSub: string;
  /** Always set from DB (.notNull); memory deps must set too. */
  createdAt: Date;
  updatedAt: Date;
};

export type VaccineListFilter = {
  from?: Date;
  to?: Date;
  cursor?: { atMs: number; id: string } | null;
  limit: number;
};

export type VaccineDeps = {
  ensureBabyProfile: (workspaceId: string) => Promise<{ id: string }>;
  insertVaccine: (values: {
    workspaceId: string;
    babyId: string;
    name: string;
    dose: "first" | "second";
    administeredAt: Date;
    notes: string | null;
    source: "web" | "telegram";
    createdByUserSub: string;
    updatedByUserSub: string;
  }) => Promise<BabyVaccineRow>;
  listVaccines: (
    workspaceId: string,
    filter: VaccineListFilter,
  ) => Promise<BabyVaccineRow[]>;
  findVaccine: (
    workspaceId: string,
    id: string,
  ) => Promise<BabyVaccineRow | null>;
  updateVaccine: (
    workspaceId: string,
    id: string,
    patch: {
      name?: string;
      dose?: "first" | "second";
      administeredAt?: Date;
      notes?: string | null;
      updatedByUserSub: string;
      updatedAt: Date;
    },
  ) => Promise<BabyVaccineRow | null>;
  deleteVaccine: (
    workspaceId: string,
    id: string,
  ) => Promise<BabyVaccineRow | null>;
};

async function defaultInsertVaccine(
  values: Parameters<VaccineDeps["insertVaccine"]>[0],
): Promise<BabyVaccineRow> {
  const [row] = await db
    .insert(babyVaccineEntry)
    .values({
      workspaceId: values.workspaceId,
      babyId: values.babyId,
      name: values.name,
      dose: values.dose,
      administeredAt: values.administeredAt,
      notes: values.notes,
      source: values.source,
      createdByUserSub: values.createdByUserSub,
      updatedByUserSub: values.updatedByUserSub,
    })
    .returning();
  return row;
}

async function defaultListVaccines(
  workspaceId: string,
  filter: VaccineListFilter,
): Promise<BabyVaccineRow[]> {
  const conds = [eq(babyVaccineEntry.workspaceId, workspaceId)];
  if (filter.from) {
    conds.push(gte(babyVaccineEntry.administeredAt, filter.from));
  }
  if (filter.to) {
    conds.push(lte(babyVaccineEntry.administeredAt, filter.to));
  }
  if (filter.cursor) {
    const at = new Date(filter.cursor.atMs);
    conds.push(
      or(
        lt(babyVaccineEntry.administeredAt, at),
        and(
          eq(babyVaccineEntry.administeredAt, at),
          lt(babyVaccineEntry.id, filter.cursor.id),
        ),
      ) as SQL,
    );
  }

  return db
    .select()
    .from(babyVaccineEntry)
    .where(and(...conds))
    .orderBy(desc(babyVaccineEntry.administeredAt), desc(babyVaccineEntry.id))
    .limit(filter.limit);
}

async function defaultFindVaccine(
  workspaceId: string,
  id: string,
): Promise<BabyVaccineRow | null> {
  const rows = await db
    .select()
    .from(babyVaccineEntry)
    .where(
      and(
        eq(babyVaccineEntry.id, id),
        eq(babyVaccineEntry.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function defaultUpdateVaccine(
  workspaceId: string,
  id: string,
  patch: Parameters<VaccineDeps["updateVaccine"]>[2],
): Promise<BabyVaccineRow | null> {
  const [row] = await db
    .update(babyVaccineEntry)
    .set(patch)
    .where(
      and(
        eq(babyVaccineEntry.id, id),
        eq(babyVaccineEntry.workspaceId, workspaceId),
      ),
    )
    .returning();
  return row ?? null;
}

async function defaultDeleteVaccine(
  workspaceId: string,
  id: string,
): Promise<BabyVaccineRow | null> {
  const [row] = await db
    .delete(babyVaccineEntry)
    .where(
      and(
        eq(babyVaccineEntry.id, id),
        eq(babyVaccineEntry.workspaceId, workspaceId),
      ),
    )
    .returning();
  return row ?? null;
}

function defaultDeps(): VaccineDeps {
  return {
    ensureBabyProfile: (workspaceId) => ensureBabyProfile(workspaceId),
    insertVaccine: defaultInsertVaccine,
    listVaccines: defaultListVaccines,
    findVaccine: defaultFindVaccine,
    updateVaccine: defaultUpdateVaccine,
    deleteVaccine: defaultDeleteVaccine,
  };
}

export async function createBabyVaccine(
  workspaceId: string,
  userSub: string,
  raw: CreateBabyVaccineInput,
  deps: VaccineDeps = defaultDeps(),
) {
  const input = parseOrThrow(createBabyVaccineSchema, raw);
  const baby = await deps.ensureBabyProfile(workspaceId);
  return deps.insertVaccine({
    workspaceId,
    babyId: baby.id,
    name: input.name,
    dose: input.dose,
    administeredAt: input.administeredAt
      ? new Date(input.administeredAt)
      : new Date(),
    notes: input.notes ?? null,
    source: input.source ?? "web",
    createdByUserSub: userSub,
    updatedByUserSub: userSub,
  });
}

export async function listBabyVaccines(
  workspaceId: string,
  raw?: unknown,
  deps: VaccineDeps = defaultDeps(),
) {
  const input = babyVaccineListInputSchema.parse(raw ?? {});
  const limit = input.limit ?? 50;

  let cursor: { atMs: number; id: string } | null = null;
  if (input.cursor) {
    cursor = decodeBabyVaccineCursor(input.cursor);
    if (!cursor) throw new Error("Validation failed: bad cursor");
  }

  const rows = await deps.listVaccines(workspaceId, {
    from: input.from ? new Date(input.from) : undefined,
    to: input.to ? new Date(input.to) : undefined,
    cursor,
    limit,
  });

  const nextCursor =
    rows.length === limit
      ? encodeBabyVaccineCursor(
          rows[rows.length - 1]!.administeredAt.getTime(),
          rows[rows.length - 1]!.id,
        )
      : null;

  return { items: rows, nextCursor };
}

export async function updateBabyVaccine(
  workspaceId: string,
  userSub: string,
  raw: unknown,
  deps: VaccineDeps = defaultDeps(),
) {
  const input = parseOrThrow(updateBabyVaccineSchema, raw);
  const existing = await deps.findVaccine(workspaceId, input.id);
  if (!existing) throw new Error("NOT_FOUND");

  const row = await deps.updateVaccine(workspaceId, input.id, {
    ...(input.name ? { name: input.name } : {}),
    ...(input.dose ? { dose: input.dose } : {}),
    ...(input.administeredAt
      ? { administeredAt: new Date(input.administeredAt) }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    updatedByUserSub: userSub,
    updatedAt: new Date(),
  });
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function deleteBabyVaccine(
  workspaceId: string,
  id: string,
  deps: VaccineDeps = defaultDeps(),
) {
  const row = await deps.deleteVaccine(workspaceId, id);
  if (!row) throw new Error("NOT_FOUND");
  return row;
}
