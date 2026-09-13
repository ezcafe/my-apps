import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  babyCareEvent,
  babyQuickCareRequest,
  type BabyCarePayload,
  type BabyFeedPayload,
  type BabyQuickCareStoredResult,
} from "@/db/schema/baby";
import {
  findOpenSleep,
  rethrowOpenSleepConflict,
  type BabyCareEventRow,
} from "@/features/baby/server/care-events";
import { withBabyCareLock } from "@/features/baby/server/care-lock";
import { ensureBabyProfile } from "@/features/baby/server/profile";
import type { BabyQuickCareStepName } from "@/lib/baby-quick-care-order-fixture";
import {
  isFeedSessionMergeable,
  mergeFeedLegs,
  rollUpFeedPayload,
  type BabyFeedLeg,
} from "@/lib/baby-feed-session";
import { isPgUniqueViolation } from "@/lib/pg-unique";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { babyQuickCareSchema } from "@/lib/validators/baby";

export type BabyQuickCareWrote = "insert" | "update";

export type BabyQuickCareStep = {
  step: BabyQuickCareStepName;
  wrote: BabyQuickCareWrote;
  event: BabyCareEventRow;
};

export type BabyQuickCareResultRow = {
  steps: BabyQuickCareStep[];
  replayed: boolean;
  openSleep: BabyCareEventRow | null;
};

export type BabyQuickCareDeps = {
  ensureBabyProfile: (workspaceId: string) => Promise<{ id: string }>;
  withCareLock: <T>(
    workspaceId: string,
    run: () => Promise<T>,
  ) => Promise<T>;
  findStoredResult: (
    workspaceId: string,
    requestId: string,
  ) => Promise<BabyQuickCareStoredResult | null>;
  findOpenSleep: (
    workspaceId: string,
    babyId: string,
  ) => Promise<BabyCareEventRow | null>;
  findCareEventById: (
    workspaceId: string,
    id: string,
  ) => Promise<BabyCareEventRow | null>;
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
  updateCareEvent: (
    workspaceId: string,
    id: string,
    patch: Record<string, unknown>,
  ) => Promise<BabyCareEventRow>;
  storeResult: (
    workspaceId: string,
    babyId: string,
    requestId: string,
    result: BabyQuickCareStoredResult,
  ) => Promise<void>;
  /** Injectable clock for merge window tests. */
  now?: () => Date;
};

function serializeStoredEvent(row: BabyCareEventRow): BabyQuickCareStoredResult["steps"][number]["event"] {
  return {
    id: row.id,
    type: row.type,
    occurredAt: row.occurredAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    payload: row.payload as BabyCarePayload,
  };
}

function resultFromStored(
  stored: BabyQuickCareStoredResult,
): BabyQuickCareResultRow {
  return {
    replayed: true,
    openSleep: stored.openSleep
      ? ({
          id: stored.openSleep.id,
          workspaceId: "",
          babyId: "",
          type: "sleep",
          occurredAt: new Date(stored.openSleep.occurredAt),
          endedAt: stored.openSleep.endedAt
            ? new Date(stored.openSleep.endedAt)
            : null,
          payload: {},
          source: "web",
          createdByUserSub: "",
          updatedByUserSub: "",
        } satisfies BabyCareEventRow)
      : null,
    steps: stored.steps.map((s) => ({
      step: s.step,
      wrote: s.wrote ?? "insert",
      event: {
        id: s.event.id,
        workspaceId: "",
        babyId: "",
        type: s.event.type,
        occurredAt: new Date(s.event.occurredAt),
        endedAt: s.event.endedAt ? new Date(s.event.endedAt) : null,
        payload: s.event.payload,
        source: "web",
        createdByUserSub: "",
        updatedByUserSub: "",
      },
    })),
  };
}

function toStoredResult(
  steps: BabyQuickCareStep[],
  openSleep: BabyCareEventRow | null,
): BabyQuickCareStoredResult {
  return {
    v: 1,
    steps: steps.map((s) => ({
      step: s.step,
      wrote: s.wrote,
      event: serializeStoredEvent(s.event),
    })),
    openSleep: openSleep
      ? {
          id: openSleep.id,
          occurredAt: openSleep.occurredAt.toISOString(),
          endedAt: openSleep.endedAt?.toISOString() ?? null,
        }
      : null,
  };
}

async function defaultFindStored(
  workspaceId: string,
  requestId: string,
): Promise<BabyQuickCareStoredResult | null> {
  const rows = await db
    .select({ result: babyQuickCareRequest.result })
    .from(babyQuickCareRequest)
    .where(
      and(
        eq(babyQuickCareRequest.workspaceId, workspaceId),
        eq(babyQuickCareRequest.requestId, requestId),
      ),
    )
    .limit(1);
  return rows[0]?.result ?? null;
}

async function defaultStoreResult(
  workspaceId: string,
  babyId: string,
  requestId: string,
  result: BabyQuickCareStoredResult,
): Promise<void> {
  await db.insert(babyQuickCareRequest).values({
    workspaceId,
    babyId,
    requestId,
    result,
  });
}

async function defaultInsert(
  values: Parameters<BabyQuickCareDeps["insertCareEvent"]>[0],
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
        payload: values.payload as BabyCarePayload,
        source: values.source,
        createdByUserSub: values.createdByUserSub,
        updatedByUserSub: values.updatedByUserSub,
      })
      .returning();
    return row!;
  } catch (e) {
    if (values.type === "sleep" && values.endedAt == null) {
      rethrowOpenSleepConflict(e);
    }
    throw e;
  }
}

async function defaultUpdate(
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
  return row!;
}

async function defaultFindById(
  workspaceId: string,
  id: string,
): Promise<BabyCareEventRow | null> {
  const rows = await db
    .select()
    .from(babyCareEvent)
    .where(
      and(eq(babyCareEvent.id, id), eq(babyCareEvent.workspaceId, workspaceId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export function defaultQuickCareDeps(): BabyQuickCareDeps {
  return {
    ensureBabyProfile: (ws) => ensureBabyProfile(ws),
    withCareLock: (ws, run) => withBabyCareLock(ws, async () => run()),
    findStoredResult: defaultFindStored,
    findOpenSleep,
    findCareEventById: defaultFindById,
    insertCareEvent: defaultInsert,
    updateCareEvent: defaultUpdate,
    storeResult: defaultStoreResult,
  };
}

function requestWritesFeed(input: {
  breastRunning?: { side: string; durationSec: number } | null;
  action: { kind: string };
}): boolean {
  return Boolean(input.breastRunning) || input.action.kind === "FORMULA";
}

function legsFromExistingPayload(payload: unknown): BabyFeedLeg[] {
  const p = (payload ?? {}) as BabyFeedPayload;
  if (Array.isArray(p.legs) && p.legs.length > 0) {
    return p.legs.map((l) => ({
      method: l.method,
      ...(typeof l.durationSec === "number" ? { durationSec: l.durationSec } : {}),
      ...(typeof l.amountMl === "number" ? { amountMl: l.amountMl } : {}),
    }));
  }
  if (!p.method) return [];
  const leg: BabyFeedLeg = { method: p.method };
  if (typeof p.durationSec === "number") leg.durationSec = p.durationSec;
  if (typeof p.amountMl === "number") leg.amountMl = p.amountMl;
  return [leg];
}

function feedPayloadFromLegs(
  legs: BabyFeedLeg[],
  trace: { quickRequestId: string },
): BabyFeedPayload {
  const rolled = rollUpFeedPayload(legs);
  return {
    ...rolled,
    ...trace,
  };
}

/**
 * Ordered quick-care chain. Runs inside the shared nap lock.
 * payload.quickRequestId is a trace key only — never used for replay.
 */
export async function runBabyQuickCare(
  workspaceId: string,
  userSub: string,
  raw: unknown,
  deps: BabyQuickCareDeps = defaultQuickCareDeps(),
): Promise<BabyQuickCareResultRow> {
  const input = parseOrThrow(babyQuickCareSchema, raw);
  const requestId = input.clientRequestId.trim();

  try {
    return await deps.withCareLock(workspaceId, async () => {
      const stored = await deps.findStoredResult(workspaceId, requestId);
      if (stored) {
        return resultFromStored(stored);
      }

      const baby = await deps.ensureBabyProfile(workspaceId);
      const now = deps.now ? deps.now() : new Date();
      const steps: BabyQuickCareStep[] = [];
      const trace = { quickRequestId: requestId };

      /** Session feed row created/updated earlier in this request (2A chain). */
      let sessionFeed: BabyCareEventRow | null = null;
      /** Only load/merge session id when this request writes a feed. */
      const feedWrite = requestWritesFeed(input);
      const sessionId =
        feedWrite && input.feedSessionEventId
          ? input.feedSessionEventId
          : undefined;

      async function writeFeedLegs(
        step: "saveBreast" | "createFormula",
        incoming: BabyFeedLeg[],
        opts: { breastRunningForMerge: boolean },
      ): Promise<BabyQuickCareStep> {
        // Same-request 2A: breast already inserted → always update that row.
        if (sessionFeed) {
          const existingLegs = legsFromExistingPayload(sessionFeed.payload);
          const merged = mergeFeedLegs(existingLegs, incoming);
          const payload = feedPayloadFromLegs(merged, trace);
          const event = await deps.updateCareEvent(
            workspaceId,
            sessionFeed.id,
            {
              payload,
              updatedByUserSub: userSub,
              updatedAt: now,
            },
          );
          sessionFeed = event;
          return { step, wrote: "update", event };
        }

        let target: BabyCareEventRow | null = null;
        if (sessionId) {
          const found = await deps.findCareEventById(workspaceId, sessionId);
          if (
            !found ||
            found.type !== "feed" ||
            found.babyId !== baby.id
          ) {
            throw new Error("NOT_FOUND");
          }
          const updatedAt = found.updatedAt ?? found.occurredAt;
          // Option B: client only sends feedSessionEventId while still in grace.
          // Allow ≤6 min server delta so mild clock skew does not force a new row.
          const mergeable = isFeedSessionMergeable({
            hasSessionId: true,
            breastRunning: opts.breastRunningForMerge,
            updatedAt,
            now: now.getTime(),
            clientStillInGrace: true,
          });
          if (mergeable) {
            target = found;
          }
          // Non-mergeable owned id → fall through to INSERT (not an update target).
        }

        if (target) {
          const existingLegs = legsFromExistingPayload(target.payload);
          const merged = mergeFeedLegs(existingLegs, incoming);
          const payload = feedPayloadFromLegs(merged, trace);
          const event = await deps.updateCareEvent(workspaceId, target.id, {
            payload,
            updatedByUserSub: userSub,
            updatedAt: now,
            // occurred_at intentionally unchanged
          });
          sessionFeed = event;
          return { step, wrote: "update", event };
        }

        const payload = feedPayloadFromLegs(incoming, trace);
        const event = await deps.insertCareEvent({
          workspaceId,
          babyId: baby.id,
          type: "feed",
          occurredAt: now,
          payload,
          source: "web",
          createdByUserSub: userSub,
          updatedByUserSub: userSub,
        });
        sessionFeed = event;
        return { step, wrote: "insert", event };
      }

      if (input.breastRunning) {
        const step = await writeFeedLegs(
          "saveBreast",
          [
            {
              method: input.breastRunning.side,
              durationSec: input.breastRunning.durationSec,
            },
          ],
          { breastRunningForMerge: true },
        );
        steps.push(step);
      }

      const openBefore = await deps.findOpenSleep(workspaceId, baby.id);
      let endedNap = false;
      if (openBefore) {
        const payload = {
          ...((openBefore.payload as object) ?? {}),
          ...trace,
        };
        const event = await deps.updateCareEvent(workspaceId, openBefore.id, {
          endedAt: now,
          payload,
          updatedByUserSub: userSub,
          updatedAt: now,
        });
        steps.push({ step: "endNap", wrote: "update", event });
        endedNap = true;
      }

      const kind = input.action.kind;
      if (kind === "FORMULA") {
        const step = await writeFeedLegs(
          "createFormula",
          [
            {
              method: "formula",
              amountMl: input.action.amountMl,
            },
          ],
          // Open continuation only when breastRunning is in this request;
          // post-stop bottle uses grace on the target row.
          {
            breastRunningForMerge: Boolean(input.breastRunning),
          },
        );
        steps.push(step);
      } else if (kind === "DIAPER") {
        const diaperKind = input.action.diaperKind!;
        const detailAllowed =
          diaperKind === "dirty" || diaperKind === "mixed";
        const payload: BabyCarePayload = {
          kind: diaperKind,
          ...(detailAllowed && input.action.diaperColor
            ? { color: input.action.diaperColor }
            : {}),
          ...(detailAllowed && input.action.diaperTexture
            ? { texture: input.action.diaperTexture }
            : {}),
          ...(detailAllowed
            ? {
                amount: input.action.diaperAmount ?? "medium",
              }
            : {}),
          ...trace,
        };
        const event = await deps.insertCareEvent({
          workspaceId,
          babyId: baby.id,
          type: "diaper",
          occurredAt: now,
          payload,
          source: "web",
          createdByUserSub: userSub,
          updatedByUserSub: userSub,
        });
        steps.push({ step: "createDiaper", wrote: "insert", event });
      } else if (kind === "SLEEP") {
        if (!endedNap) {
          const event = await deps.insertCareEvent({
            workspaceId,
            babyId: baby.id,
            type: "sleep",
            occurredAt: now,
            endedAt: null,
            payload: { ...trace },
            source: "web",
            createdByUserSub: userSub,
            updatedByUserSub: userSub,
          });
          steps.push({ step: "startNap", wrote: "insert", event });
        }
      }

      const openSleep = await deps.findOpenSleep(workspaceId, baby.id);
      const storedResult = toStoredResult(steps, openSleep);
      await deps.storeResult(workspaceId, baby.id, requestId, storedResult);

      return { steps, replayed: false, openSleep };
    });
  } catch (e) {
    if (isPgUniqueViolation(e)) {
      const again = await deps.findStoredResult(workspaceId, requestId);
      if (again) return resultFromStored(again);
    }
    throw e;
  }
}
