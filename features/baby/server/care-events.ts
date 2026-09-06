import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  babyCareEvent,
  type BabyDiaperPayload,
  type BabyFeedPayload,
  type BabySleepPayload,
} from "@/db/schema/baby";
import { ensureBabyProfile } from "@/features/baby/server/profile";
import { isPgUniqueViolation } from "@/lib/pg-unique";
import { parseOrThrow } from "@/lib/parse-or-throw";
import {
  createBabyDiaperSchema,
  createBabyFeedSchema,
  endBabySleepSchema,
  startBabySleepSchema,
  updateBabyEventPayloadSchemaForType,
  updateBabyEventSchema,
  type CreateBabyDiaperInput,
  type CreateBabyFeedInput,
  type EndBabySleepInput,
  type StartBabySleepInput,
} from "@/lib/validators/baby";

function toDate(iso?: string): Date {
  return iso ? new Date(iso) : new Date();
}

export type BabyCareEventRow = {
  id: string;
  workspaceId: string;
  babyId: string;
  type: "feed" | "diaper" | "sleep";
  occurredAt: Date;
  endedAt: Date | null;
  payload: unknown;
  source: "web" | "telegram";
  createdByUserSub: string;
  updatedByUserSub: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CareEventDeps = {
  ensureBabyProfile: (
    workspaceId: string,
  ) => Promise<{ id: string }>;
  insertCareEvent: (
    values: {
      workspaceId: string;
      babyId: string;
      type: "feed" | "diaper" | "sleep";
      occurredAt: Date;
      endedAt?: Date | null;
      payload: unknown;
      source: "web" | "telegram";
      createdByUserSub: string;
      updatedByUserSub: string;
    },
  ) => Promise<BabyCareEventRow>;
  findOpenSleep: (
    workspaceId: string,
    babyId: string,
  ) => Promise<BabyCareEventRow | null>;
  getSleepById: (
    workspaceId: string,
    eventId: string,
  ) => Promise<BabyCareEventRow | null>;
  updateCareEvent: (
    workspaceId: string,
    id: string,
    patch: Record<string, unknown>,
  ) => Promise<BabyCareEventRow>;
  getEventById?: (
    workspaceId: string,
    eventId: string,
  ) => Promise<BabyCareEventRow | null>;
};

export function assertCanStartSleep(
  open: { id: string } | null | undefined,
): void {
  if (open) {
    throw new Error("CONFLICT: Sleep already open");
  }
}

export function requireOpenSleepForEnd(
  open: BabyCareEventRow | null | undefined,
): BabyCareEventRow {
  if (!open || open.endedAt) {
    throw new Error("NOT_FOUND");
  }
  return open;
}

/** Map concurrent open-sleep unique violation to CONFLICT. */
export function rethrowOpenSleepConflict(error: unknown): never {
  if (isPgUniqueViolation(error)) {
    throw new Error("CONFLICT: Sleep already open");
  }
  throw error;
}

async function defaultInsertCareEvent(
  values: Parameters<CareEventDeps["insertCareEvent"]>[0],
): Promise<BabyCareEventRow> {
  try {
    const [row] = await db
      .insert(babyCareEvent)
      .values({
        workspaceId: values.workspaceId,
        babyId: values.babyId,
        type: values.type,
        occurredAt: values.occurredAt,
        endedAt: values.endedAt ?? null,
        payload: values.payload as
          | BabyFeedPayload
          | BabyDiaperPayload
          | BabySleepPayload,
        source: values.source,
        createdByUserSub: values.createdByUserSub,
        updatedByUserSub: values.updatedByUserSub,
      })
      .returning();
    return row;
  } catch (e) {
    if (values.type === "sleep" && values.endedAt == null) {
      rethrowOpenSleepConflict(e);
    }
    throw e;
  }
}

async function defaultGetSleepById(
  workspaceId: string,
  eventId: string,
): Promise<BabyCareEventRow | null> {
  const rows = await db
    .select()
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.id, eventId),
        eq(babyCareEvent.workspaceId, workspaceId),
        eq(babyCareEvent.type, "sleep"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function defaultUpdateCareEvent(
  workspaceId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<BabyCareEventRow> {
  const [row] = await db
    .update(babyCareEvent)
    .set(patch)
    .where(
      and(eq(babyCareEvent.id, id), eq(babyCareEvent.workspaceId, workspaceId)),
    )
    .returning();
  return row;
}

async function defaultGetEventById(
  workspaceId: string,
  eventId: string,
): Promise<BabyCareEventRow | null> {
  const rows = await db
    .select()
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.id, eventId),
        eq(babyCareEvent.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function defaultDeps(): CareEventDeps {
  return {
    ensureBabyProfile: (workspaceId) => ensureBabyProfile(workspaceId),
    insertCareEvent: defaultInsertCareEvent,
    findOpenSleep,
    getSleepById: defaultGetSleepById,
    updateCareEvent: defaultUpdateCareEvent,
    getEventById: defaultGetEventById,
  };
}

export async function createBabyFeed(
  workspaceId: string,
  userSub: string,
  raw: CreateBabyFeedInput,
  deps: CareEventDeps = defaultDeps(),
) {
  const input = parseOrThrow(createBabyFeedSchema, raw);
  const baby = await deps.ensureBabyProfile(workspaceId);
  const payload: BabyFeedPayload = {
    method: input.method,
    ...(input.durationSec != null ? { durationSec: input.durationSec } : {}),
    ...(input.amountMl != null ? { amountMl: input.amountMl } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };
  return deps.insertCareEvent({
    workspaceId,
    babyId: baby.id,
    type: "feed",
    occurredAt: toDate(input.occurredAt),
    payload,
    source: input.source ?? "web",
    createdByUserSub: userSub,
    updatedByUserSub: userSub,
  });
}

export async function createBabyDiaper(
  workspaceId: string,
  userSub: string,
  raw: CreateBabyDiaperInput,
  deps: CareEventDeps = defaultDeps(),
) {
  const input = parseOrThrow(createBabyDiaperSchema, raw);
  const baby = await deps.ensureBabyProfile(workspaceId);
  const payload: BabyDiaperPayload = {
    kind: input.kind,
    ...(input.notes ? { notes: input.notes } : {}),
  };
  return deps.insertCareEvent({
    workspaceId,
    babyId: baby.id,
    type: "diaper",
    occurredAt: toDate(input.occurredAt),
    payload,
    source: input.source ?? "web",
    createdByUserSub: userSub,
    updatedByUserSub: userSub,
  });
}

export async function findOpenSleep(workspaceId: string, babyId: string) {
  const rows = await db
    .select()
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.workspaceId, workspaceId),
        eq(babyCareEvent.babyId, babyId),
        eq(babyCareEvent.type, "sleep"),
        isNull(babyCareEvent.endedAt),
      ),
    )
    .orderBy(desc(babyCareEvent.occurredAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function startBabySleep(
  workspaceId: string,
  userSub: string,
  raw: StartBabySleepInput = {},
  deps: CareEventDeps = defaultDeps(),
) {
  const input = parseOrThrow(startBabySleepSchema, raw);
  const baby = await deps.ensureBabyProfile(workspaceId);
  const open = await deps.findOpenSleep(workspaceId, baby.id);
  assertCanStartSleep(open);
  const payload: BabySleepPayload = {
    ...(input.notes ? { notes: input.notes } : {}),
  };
  try {
    return await deps.insertCareEvent({
      workspaceId,
      babyId: baby.id,
      type: "sleep",
      occurredAt: toDate(input.occurredAt),
      endedAt: null,
      payload,
      source: input.source ?? "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
    });
  } catch (e) {
    rethrowOpenSleepConflict(e);
  }
}

export async function endBabySleep(
  workspaceId: string,
  userSub: string,
  raw: EndBabySleepInput = {},
  deps: CareEventDeps = defaultDeps(),
) {
  const input = parseOrThrow(endBabySleepSchema, raw);
  const baby = await deps.ensureBabyProfile(workspaceId);
  const open = input.eventId
    ? await deps.getSleepById(workspaceId, input.eventId)
    : await deps.findOpenSleep(workspaceId, baby.id);

  const target = requireOpenSleepForEnd(open);

  return deps.updateCareEvent(workspaceId, target.id, {
    endedAt: toDate(input.endedAt),
    updatedByUserSub: userSub,
    updatedAt: new Date(),
  });
}

export async function updateBabyEvent(
  workspaceId: string,
  userSub: string,
  raw: unknown,
  deps: CareEventDeps = defaultDeps(),
) {
  const input = parseOrThrow(updateBabyEventSchema, raw);
  const getById = deps.getEventById ?? defaultGetEventById;
  const existing = await getById(workspaceId, input.id);
  if (!existing) throw new Error("NOT_FOUND");

  let nextPayload = existing.payload;
  if (input.payload !== undefined) {
    const patch = parseOrThrow(
      updateBabyEventPayloadSchemaForType(existing.type),
      input.payload,
    );
    nextPayload = { ...(existing.payload as object), ...patch };
  }

  return deps.updateCareEvent(workspaceId, existing.id, {
    ...(input.occurredAt ? { occurredAt: new Date(input.occurredAt) } : {}),
    ...(input.endedAt !== undefined
      ? { endedAt: input.endedAt ? new Date(input.endedAt) : null }
      : {}),
    ...(input.payload !== undefined ? { payload: nextPayload } : {}),
    updatedByUserSub: userSub,
    updatedAt: new Date(),
  });
}

export async function deleteBabyEvent(workspaceId: string, eventId: string) {
  const [row] = await db
    .delete(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.id, eventId),
        eq(babyCareEvent.workspaceId, workspaceId),
      ),
    )
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function getBabyEvent(workspaceId: string, eventId: string) {
  const rows = await db
    .select()
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.id, eventId),
        eq(babyCareEvent.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
