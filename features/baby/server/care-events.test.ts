import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCanStartSleep,
  createBabyDiaper,
  createBabyFeed,
  endBabySleep,
  requireOpenSleepForEnd,
  startBabySleep,
  updateBabyEvent,
  type BabyCareEventRow,
  type CareEventDeps,
} from "@/features/baby/server/care-events";

const babyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userSub = "caregiver-1";

function memoryDeps(seed: {
  openSleep?: BabyCareEventRow | null;
  rows?: BabyCareEventRow[];
}): CareEventDeps & { rows: BabyCareEventRow[] } {
  const rows: BabyCareEventRow[] = seed.rows ? [...seed.rows] : [];
  let openSleep = seed.openSleep ?? null;

  return {
    rows,
    ensureBabyProfile: async () => ({ id: babyId }),
    insertCareEvent: async (values) => {
      const row: BabyCareEventRow = {
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(rows.length + 1).padStart(12, "0")}`,
        workspaceId: values.workspaceId,
        babyId: values.babyId,
        type: values.type,
        occurredAt: values.occurredAt,
        endedAt: values.endedAt ?? null,
        payload: values.payload,
        source: values.source,
        createdByUserSub: values.createdByUserSub,
        updatedByUserSub: values.updatedByUserSub,
      };
      rows.push(row);
      if (values.type === "sleep" && values.endedAt == null) {
        openSleep = row;
      }
      return row;
    },
    findOpenSleep: async () => openSleep,
    getSleepById: async (_ws, eventId) =>
      rows.find((r) => r.id === eventId && r.type === "sleep") ?? null,
    updateCareEvent: async (ws, id, patch) => {
      assert.equal(ws, workspaceId);
      const idx = rows.findIndex((r) => r.id === id);
      assert.ok(idx >= 0);
      const next = { ...rows[idx], ...patch };
      rows[idx] = next;
      if (openSleep?.id === id) openSleep = null;
      return next;
    },
    getEventById: async (_ws, eventId) =>
      rows.find((r) => r.id === eventId) ?? null,
    deleteCareEvent: async (_ws, eventId) => {
      const idx = rows.findIndex((r) => r.id === eventId);
      assert.ok(idx >= 0);
      const [removed] = rows.splice(idx, 1);
      if (openSleep?.id === eventId) openSleep = null;
      return removed!;
    },
    // Passthrough so stubbed tests do not hit Postgres for the nap lock.
    runInCareLock: async (_ws, run) => run(),
  };
}

describe("care event services (mocked store)", () => {
  it("createBabyFeed rejects invalid method", async () => {
    const deps = memoryDeps({});
    await assert.rejects(
      () =>
        createBabyFeed(
          workspaceId,
          userSub,
          { method: "sippy" } as never,
          deps,
        ),
      /Validation failed/,
    );
  });

  it("createBabyFeed valid breast_l creates row", async () => {
    const deps = memoryDeps({});
    const row = await createBabyFeed(
      workspaceId,
      userSub,
      { method: "breast_l", durationSec: 600 },
      deps,
    );
    assert.equal(row.type, "feed");
    assert.equal((row.payload as { method: string }).method, "breast_l");
    assert.equal(deps.rows.length, 1);
  });

  it("createBabyDiaper wet/dirty/mixed/dry ok; other fails", async () => {
    const deps = memoryDeps({});
    for (const kind of ["wet", "dirty", "mixed", "dry"] as const) {
      const row = await createBabyDiaper(
        workspaceId,
        userSub,
        { kind },
        deps,
      );
      assert.equal(row.type, "diaper");
      assert.equal((row.payload as { kind: string }).kind, kind);
    }
    await assert.rejects(
      () =>
        createBabyDiaper(
          workspaceId,
          userSub,
          { kind: "messy" } as never,
          deps,
        ),
      /Validation failed/,
    );
  });

  it("createBabyDiaper dirty without amount omits amount; with detail stores fields", async () => {
    const deps = memoryDeps({});
    const noAmount = await createBabyDiaper(
      workspaceId,
      userSub,
      { kind: "dirty", color: "yellow", texture: "soft" },
      deps,
    );
    const payload = noAmount.payload as Record<string, unknown>;
    assert.equal(payload.kind, "dirty");
    assert.equal(payload.color, "yellow");
    assert.equal(payload.texture, "soft");
    assert.equal("amount" in payload, false);

    const withAmount = await createBabyDiaper(
      workspaceId,
      userSub,
      { kind: "mixed", amount: "blowout" },
      deps,
    );
    assert.equal(
      (withAmount.payload as { amount?: string }).amount,
      "blowout",
    );
  });

  it("createBabyDiaper rejects detail on wet", async () => {
    const deps = memoryDeps({});
    await assert.rejects(
      () =>
        createBabyDiaper(
          workspaceId,
          userSub,
          { kind: "wet", color: "yellow" } as never,
          deps,
        ),
      /Validation failed/,
    );
  });
});

describe("startBabySleep / endBabySleep", () => {
  it("assertCanStartSleep throws CONFLICT when open", () => {
    assert.throws(
      () => assertCanStartSleep({ id: "open-1" }),
      (e: unknown) =>
        e instanceof Error && e.message.includes("CONFLICT"),
    );
  });

  it("two starts without end → second throws conflict", async () => {
    const deps = memoryDeps({});
    await startBabySleep(workspaceId, userSub, {}, deps);
    await assert.rejects(
      () => startBabySleep(workspaceId, userSub, {}, deps),
      (e: unknown) =>
        e instanceof Error && e.message.includes("CONFLICT"),
    );
  });

  it("end closes open sleep", async () => {
    const deps = memoryDeps({});
    const started = await startBabySleep(workspaceId, userSub, {}, deps);
    const ended = await endBabySleep(workspaceId, userSub, {}, deps);
    assert.equal(ended.id, started.id);
    assert.ok(ended.endedAt);
    // After end, a new start should succeed
    const again = await startBabySleep(workspaceId, userSub, {}, deps);
    assert.equal(again.type, "sleep");
    assert.equal(again.endedAt, null);
  });

  it("end with no open sleep → NOT_FOUND", async () => {
    const deps = memoryDeps({ openSleep: null });
    await assert.rejects(
      () => endBabySleep(workspaceId, userSub, {}, deps),
      (e: unknown) => e instanceof Error && e.message === "NOT_FOUND",
    );
  });

  it("endBabySleep({ eventId }) wrong id → NOT_FOUND", async () => {
    const deps = memoryDeps({});
    await startBabySleep(workspaceId, userSub, {}, deps);
    await assert.rejects(
      () =>
        endBabySleep(
          workspaceId,
          userSub,
          { eventId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
          deps,
        ),
      (e: unknown) => e instanceof Error && e.message === "NOT_FOUND",
    );
  });

  it("endBabySleep({ eventId }) valid id closes", async () => {
    const sleepId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const openRow: BabyCareEventRow = {
      id: sleepId,
      workspaceId,
      babyId,
      type: "sleep",
      occurredAt: new Date(),
      endedAt: null,
      payload: {},
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
    };
    const deps = memoryDeps({ rows: [openRow], openSleep: openRow });
    const ended = await endBabySleep(
      workspaceId,
      userSub,
      { eventId: sleepId },
      deps,
    );
    assert.equal(ended.id, sleepId);
    assert.ok(ended.endedAt);
  });

  it("unique violation on insert → CONFLICT", async () => {
    const deps = memoryDeps({});
    deps.findOpenSleep = async () => null;
    deps.insertCareEvent = async () => {
      const err = Object.assign(new Error("duplicate"), { code: "23505" });
      throw err;
    };
    await assert.rejects(
      () => startBabySleep(workspaceId, userSub, {}, deps),
      (e: unknown) =>
        e instanceof Error && e.message.includes("CONFLICT"),
    );
  });

  it("updateBabyEvent patches payload notes", async () => {
    const deps = memoryDeps({});
    const feed = await createBabyFeed(
      workspaceId,
      userSub,
      { method: "formula", amountMl: 60 },
      deps,
    );
    deps.getEventById = async (_ws, id) =>
      deps.rows.find((r) => r.id === id) ?? null;
    const updated = await updateBabyEvent(
      workspaceId,
      userSub,
      { id: feed.id, payload: { notes: "top-up" } },
      deps,
    );
    assert.equal((updated.payload as { notes?: string }).notes, "top-up");
    assert.equal((updated.payload as { method?: string }).method, "formula");
  });

  it("updateBabyEvent rejects unknown payload keys", async () => {
    const deps = memoryDeps({});
    const feed = await createBabyFeed(
      workspaceId,
      userSub,
      { method: "formula" },
      deps,
    );
    deps.getEventById = async (_ws, id) =>
      deps.rows.find((r) => r.id === id) ?? null;
    await assert.rejects(
      () =>
        updateBabyEvent(
          workspaceId,
          userSub,
          { id: feed.id, payload: { notes: "x", evil: 1 } },
          deps,
        ),
      /Validation failed/,
    );
  });

  it("updateBabyEvent rejects omit-kind detail on wet/dry diaper", async () => {
    const deps = memoryDeps({});
    const wet = await createBabyDiaper(
      workspaceId,
      userSub,
      { kind: "wet" },
      deps,
    );
    deps.getEventById = async (_ws, id) =>
      deps.rows.find((r) => r.id === id) ?? null;
    await assert.rejects(
      () =>
        updateBabyEvent(
          workspaceId,
          userSub,
          { id: wet.id, payload: { color: "red_bloody" } },
          deps,
        ),
      /Validation failed|diaper detail not allowed/i,
    );
    const dry = await createBabyDiaper(
      workspaceId,
      userSub,
      { kind: "dry" },
      deps,
    );
    await assert.rejects(
      () =>
        updateBabyEvent(
          workspaceId,
          userSub,
          { id: dry.id, payload: { amount: "medium" } },
          deps,
        ),
      /Validation failed|diaper detail not allowed/i,
    );
  });

  it("updateBabyEvent strips detail when kind flips to wet/dry", async () => {
    const deps = memoryDeps({});
    const dirty = await createBabyDiaper(
      workspaceId,
      userSub,
      {
        kind: "dirty",
        color: "yellow",
        texture: "soft",
        amount: "medium",
      },
      deps,
    );
    deps.getEventById = async (_ws, id) =>
      deps.rows.find((r) => r.id === id) ?? null;
    const updated = await updateBabyEvent(
      workspaceId,
      userSub,
      { id: dirty.id, payload: { kind: "wet" } },
      deps,
    );
    const payload = updated.payload as Record<string, unknown>;
    assert.equal(payload.kind, "wet");
    assert.equal("color" in payload, false);
    assert.equal("texture" in payload, false);
    assert.equal("amount" in payload, false);
  });

  it("requireOpenSleepForEnd rejects already ended", () => {
    assert.throws(
      () =>
        requireOpenSleepForEnd({
          id: "x",
          workspaceId,
          babyId,
          type: "sleep",
          occurredAt: new Date(),
          endedAt: new Date(),
          payload: {},
          source: "web",
          createdByUserSub: userSub,
          updatedByUserSub: userSub,
        }),
      (e: unknown) => e instanceof Error && e.message === "NOT_FOUND",
    );
  });

  it("start/end sleep take the care lock; feed/diaper create do not", async () => {
    const sleepLocks: string[] = [];
    const feedLocks: string[] = [];
    const sleepDeps = memoryDeps({});
    sleepDeps.runInCareLock = async (ws, run) => {
      sleepLocks.push(ws);
      return run();
    };
    await startBabySleep(workspaceId, userSub, {}, sleepDeps);
    assert.equal(sleepLocks.length, 1);

    const open = sleepDeps.rows.find((r) => r.type === "sleep")!;
    await endBabySleep(workspaceId, userSub, { eventId: open.id }, sleepDeps);
    assert.equal(sleepLocks.length, 2);

    const feedDeps = memoryDeps({});
    feedDeps.runInCareLock = async (ws, run) => {
      feedLocks.push(ws);
      return run();
    };
    await createBabyFeed(
      workspaceId,
      userSub,
      { method: "formula", amountMl: 120 },
      feedDeps,
    );
    await createBabyDiaper(workspaceId, userSub, { kind: "wet" }, feedDeps);
    assert.equal(feedLocks.length, 0);
  });

  it("sleep-row update/delete take the lock; feed correction does not", async () => {
    const locks: string[] = [];
    const sleepRow: BabyCareEventRow = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000099",
      workspaceId,
      babyId,
      type: "sleep",
      occurredAt: new Date(),
      endedAt: new Date(),
      payload: {},
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
    };
    const feedRow: BabyCareEventRow = {
      ...sleepRow,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000098",
      type: "feed",
      payload: { method: "formula", amountMl: 100 },
      endedAt: null,
    };
    const deps = memoryDeps({ rows: [sleepRow, feedRow] });
    deps.runInCareLock = async (ws, run) => {
      locks.push(ws);
      return run();
    };

    await updateBabyEvent(
      workspaceId,
      userSub,
      { id: sleepRow.id, endedAt: null },
      deps,
    );
    assert.equal(locks.length, 1);

    await updateBabyEvent(
      workspaceId,
      userSub,
      { id: feedRow.id, payload: { amountMl: 110 } },
      deps,
    );
    assert.equal(locks.length, 1);

    const { deleteBabyEvent } = await import(
      "@/features/baby/server/care-events"
    );
    await deleteBabyEvent(workspaceId, sleepRow.id, deps);
    assert.equal(locks.length, 2);
  });
});
