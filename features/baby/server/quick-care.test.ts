import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BabyQuickCareStoredResult } from "@/db/schema/baby";
import type { BabyCareEventRow } from "@/features/baby/server/care-events";
import {
  runBabyQuickCare,
  type BabyQuickCareDeps,
} from "@/features/baby/server/quick-care";
import {
  BABY_AUTO_FINALIZE_NOW,
  BABY_AUTO_FINALIZE_TABLE,
} from "@/lib/baby-quick-care-order-fixture";
import { babyQuickCareNotifyKinds } from "@/lib/baby-quick-care-notify";
import { planBabyQuickCare } from "@/lib/baby-quick-care-plan";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const babyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userSub = "caregiver-1";

function makeDeps(opts: {
  napOpen?: boolean;
  stored?: Map<string, BabyQuickCareStoredResult>;
  failOnStep?: string;
  uniqueOnStore?: boolean;
}): BabyQuickCareDeps & {
  writes: string[];
  lockAcquiredBeforeRead: boolean;
  rows: BabyCareEventRow[];
  stored: Map<string, BabyQuickCareStoredResult>;
  storeCalls: number;
} {
  const writes: string[] = [];
  let lockSeen = false;
  let readAfterLock = false;
  let openSleep: BabyCareEventRow | null = opts.napOpen
    ? {
        id: "nap-open-1",
        workspaceId,
        babyId,
        type: "sleep",
        occurredAt: new Date(BABY_AUTO_FINALIZE_NOW - 3_600_000),
        endedAt: null,
        payload: {},
        source: "web",
        createdByUserSub: userSub,
        updatedByUserSub: userSub,
      }
    : null;
  const rows: BabyCareEventRow[] = openSleep ? [openSleep] : [];
  const stored =
    opts.stored ?? new Map<string, BabyQuickCareStoredResult>();
  let n = 0;
  let storeCalls = 0;
  let findCalls = 0;

  const deps: BabyQuickCareDeps & {
    writes: string[];
    lockAcquiredBeforeRead: boolean;
    rows: BabyCareEventRow[];
    stored: Map<string, BabyQuickCareStoredResult>;
    storeCalls: number;
  } = {
    writes,
    rows,
    stored,
    get storeCalls() {
      return storeCalls;
    },
    get lockAcquiredBeforeRead() {
      return lockSeen && readAfterLock;
    },
    ensureBabyProfile: async () => ({ id: babyId }),
    withCareLock: async (_ws, run) => {
      lockSeen = true;
      const snapRows = rows.map((r) => ({ ...r }));
      const snapStored = new Map(stored);
      const snapOpen = openSleep;
      const snapWrites = [...writes];
      try {
        return await run();
      } catch (e) {
        // Simulate transaction rollback on failure.
        rows.length = 0;
        rows.push(...snapRows);
        stored.clear();
        for (const [k, v] of snapStored) stored.set(k, v);
        openSleep = snapOpen;
        writes.length = 0;
        writes.push(...snapWrites);
        throw e;
      }
    },
    findStoredResult: async (_ws, requestId) => {
      if (lockSeen) readAfterLock = true;
      findCalls += 1;
      // Unique-violation path: first lookup misses, re-read after 23505 hits.
      if (opts.uniqueOnStore && findCalls === 1) return null;
      return stored.get(requestId) ?? null;
    },
    findOpenSleep: async () => openSleep,
    findCareEventById: async (ws, id) => {
      return (
        rows.find((r) => r.id === id && r.workspaceId === ws) ?? null
      );
    },
    insertCareEvent: async (values) => {
      const feedMethod = (values.payload as { method?: string }).method;
      const stepGuess =
        values.type === "feed" &&
        (feedMethod === "breast_l" ||
          feedMethod === "breast_r" ||
          feedMethod === "pump_l" ||
          feedMethod === "pump_r")
          ? "saveBreast"
          : values.type === "feed" && feedMethod === "pump"
            ? "createPumpAmount"
            : values.type === "feed"
              ? "createFormula"
              : values.type === "diaper"
                ? "createDiaper"
                : "startNap";
      if (opts.failOnStep === stepGuess) {
        throw new Error(`mid-chain fail at ${stepGuess}`);
      }
      writes.push(stepGuess);
      n += 1;
      const row: BabyCareEventRow = {
        id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
        workspaceId: values.workspaceId,
        babyId: values.babyId,
        type: values.type,
        occurredAt: values.occurredAt,
        endedAt: values.endedAt ?? null,
        payload: values.payload,
        source: values.source,
        createdByUserSub: values.createdByUserSub,
        updatedByUserSub: values.updatedByUserSub,
        updatedAt: values.occurredAt,
      };
      rows.push(row);
      if (values.type === "sleep" && values.endedAt == null) {
        openSleep = row;
      }
      return row;
    },
    updateCareEvent: async (_ws, id, patch) => {
      const idx = rows.findIndex((r) => r.id === id);
      const prev = rows[idx]!;
      const isEndNap = prev.type === "sleep" && patch.endedAt != null;
      if (isEndNap && opts.failOnStep === "endNap") {
        throw new Error("mid-chain fail at endNap");
      }
      if (isEndNap) {
        writes.push("endNap");
      } else if (prev.type === "feed") {
        const payload = patch.payload as
          | { method?: string; legs?: Array<{ method: string }> }
          | undefined;
        const methods = payload?.legs?.map((l) => l.method) ?? [
          payload?.method,
        ];
        if (methods.includes("formula")) {
          writes.push("createFormula");
        } else if (methods.includes("pump")) {
          writes.push("createPumpAmount");
        } else {
          writes.push("saveBreast");
        }
      }
      const next = {
        ...prev,
        ...patch,
        updatedAt:
          (patch.updatedAt as Date | undefined) ??
          prev.updatedAt ??
          new Date(),
      } as BabyCareEventRow;
      rows[idx] = next;
      if (openSleep?.id === id) openSleep = null;
      return next;
    },
    storeResult: async (_ws, _b, requestId, result) => {
      storeCalls += 1;
      if (opts.uniqueOnStore) {
        throw Object.assign(new Error("unique_violation"), { code: "23505" });
      }
      stored.set(requestId, result);
    },
  };
  return deps;
}

describe("runBabyQuickCare", () => {
  it("acquires the lock before the first read", async () => {
    const deps = makeDeps({ napOpen: false });
    await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "BREAST", side: "breast_l" },
        breastRunning: null,
        clientRequestId: "req-lock-order-1",
      },
      deps,
    );
    assert.equal(deps.lockAcquiredBeforeRead, true);
  });

  it("runs every auto-finalize table row in order", async () => {
    for (const row of BABY_AUTO_FINALIZE_TABLE) {
      const planned = planBabyQuickCare(row.action, {
        breast: row.breast,
        now: BABY_AUTO_FINALIZE_NOW,
      });
      const deps = makeDeps({ napOpen: row.napOpen });
      const result = await runBabyQuickCare(
        workspaceId,
        userSub,
        {
          ...planned.request,
          clientRequestId: `req-${row.id}`,
        },
        deps,
      );
      assert.deepEqual(
        result.steps.map((s) => s.step),
        row.expectServerSteps,
        row.id,
      );
      assert.deepEqual(deps.writes, row.expectServerSteps, row.id);
    }
  });

  it("ends nap when client sent none but in-tx read finds one", async () => {
    const deps = makeDeps({ napOpen: true });
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "DIAPER", diaperKind: "wet" },
        breastRunning: null,
        clientRequestId: "req-stale-nap-1",
      },
      deps,
    );
    assert.deepEqual(
      result.steps.map((s) => s.step),
      ["endNap", "createDiaper"],
    );
  });

  it("starts nap when client thought open but in-tx finds none", async () => {
    const deps = makeDeps({ napOpen: false });
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "SLEEP" },
        breastRunning: null,
        clientRequestId: "req-stale-closed-1",
      },
      deps,
    );
    assert.deepEqual(
      result.steps.map((s) => s.step),
      ["startNap"],
    );
  });

  it("idle breast with no nap returns empty steps and stores replay", async () => {
    const deps = makeDeps({ napOpen: false });
    const first = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "BREAST", side: "breast_l" },
        breastRunning: null,
        clientRequestId: "req-idle-breast-1",
      },
      deps,
    );
    assert.deepEqual(first.steps, []);
    assert.equal(first.replayed, false);

    const second = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "BREAST", side: "breast_l" },
        breastRunning: null,
        clientRequestId: "req-idle-breast-1",
      },
      deps,
    );
    assert.equal(second.replayed, true);
    assert.deepEqual(second.steps, []);
    assert.equal(deps.writes.length, 0);
  });

  it("same clientRequestId replays with zero new writes", async () => {
    const deps = makeDeps({ napOpen: true });
    const input = {
      action: { kind: "DIAPER" as const, diaperKind: "wet" as const },
      breastRunning: {
        side: "breast_r" as const,
        durationSec: 40,
      },
      clientRequestId: "req-replay-1",
    };
    const first = await runBabyQuickCare(workspaceId, userSub, input, deps);
    const writesAfterFirst = [...deps.writes];
    const second = await runBabyQuickCare(workspaceId, userSub, input, deps);
    assert.equal(second.replayed, true);
    assert.deepEqual(
      second.steps.map((s) => s.step),
      first.steps.map((s) => s.step),
    );
    assert.deepEqual(deps.writes, writesAfterFirst);
  });

  it("old-nap replay still works (endNap on hours-old sleep)", async () => {
    const deps = makeDeps({ napOpen: true });
    const input = {
      action: { kind: "SLEEP" as const },
      breastRunning: null,
      clientRequestId: "req-old-nap-1",
    };
    const first = await runBabyQuickCare(workspaceId, userSub, input, deps);
    assert.equal(first.steps[0]?.step, "endNap");
    const second = await runBabyQuickCare(workspaceId, userSub, input, deps);
    assert.equal(second.replayed, true);
    assert.equal(second.steps[0]?.step, "endNap");
  });

  it("unique violation on storeResult rolls back orphans then returns replay", async () => {
    const winner: BabyQuickCareStoredResult = {
      v: 1,
      steps: [
        {
          step: "createFormula",
          event: {
            id: "winner-feed",
            type: "feed",
            occurredAt: new Date(BABY_AUTO_FINALIZE_NOW).toISOString(),
            endedAt: null,
            payload: { method: "formula", amountMl: 120 },
          },
        },
      ],
      openSleep: null,
    };
    const stored = new Map<string, BabyQuickCareStoredResult>([
      ["req-unique-1", winner],
    ]);
    const deps = makeDeps({ napOpen: false, stored, uniqueOnStore: true });
    const beforeRows = deps.rows.length;
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "FORMULA", amountMl: 120 },
        breastRunning: null,
        clientRequestId: "req-unique-1",
      },
      deps,
    );
    assert.equal(result.replayed, true);
    assert.equal(result.steps[0]?.event.id, "winner-feed");
    assert.equal(deps.storeCalls, 1);
    // Care inserts in the losing tx must not survive as orphans.
    assert.equal(deps.rows.length, beforeRows);
    assert.equal(
      deps.rows.some((r) => r.id.startsWith("00000000-")),
      false,
    );
    assert.deepEqual(deps.writes, []);
  });

  it("mid-chain failure rolls back — no care rows and no request record", async () => {
    const deps = makeDeps({
      napOpen: true,
      failOnStep: "createDiaper",
    });
    const beforeRows = deps.rows.length;
    await assert.rejects(
      () =>
        runBabyQuickCare(
          workspaceId,
          userSub,
          {
            action: { kind: "DIAPER", diaperKind: "wet" },
            breastRunning: {
              side: "breast_l",
              durationSec: 30,
            },
            clientRequestId: "req-rollback-1",
          },
          deps,
        ),
      /mid-chain fail/,
    );
    assert.equal(deps.rows.length, beforeRows);
    assert.equal(deps.stored.size, 0);
    assert.equal(deps.storeCalls, 0);
    assert.deepEqual(deps.writes, []);
  });

  it("every action shape replays with identical ordered steps", async () => {
    const shapes: Array<{
      id: string;
      napOpen: boolean;
      input: {
        action:
          | { kind: "BREAST"; side: "breast_l" }
          | { kind: "FORMULA"; amountMl: number }
          | { kind: "SLEEP" }
          | { kind: "DIAPER"; diaperKind: "wet" };
        breastRunning: {
          side: "breast_l";
          durationSec: number;
        } | null;
      };
    }> = [
      {
        id: "breast-only",
        napOpen: false,
        input: {
          action: { kind: "BREAST", side: "breast_l" },
          breastRunning: { side: "breast_l", durationSec: 40 },
        },
      },
      {
        id: "bottle-only",
        napOpen: false,
        input: {
          action: { kind: "FORMULA", amountMl: 110 },
          breastRunning: null,
        },
      },
      {
        id: "sleep-start",
        napOpen: false,
        input: { action: { kind: "SLEEP" }, breastRunning: null },
      },
      {
        id: "sleep-end",
        napOpen: true,
        input: { action: { kind: "SLEEP" }, breastRunning: null },
      },
      {
        id: "diaper-only",
        napOpen: false,
        input: {
          action: { kind: "DIAPER", diaperKind: "wet" },
          breastRunning: null,
        },
      },
      {
        id: "three-step",
        napOpen: true,
        input: {
          action: { kind: "FORMULA", amountMl: 120 },
          breastRunning: { side: "breast_l", durationSec: 50 },
        },
      },
    ];

    for (const shape of shapes) {
      const deps = makeDeps({ napOpen: shape.napOpen });
      const clientRequestId = `req-shape-${shape.id}`;
      const first = await runBabyQuickCare(
        workspaceId,
        userSub,
        { ...shape.input, clientRequestId },
        deps,
      );
      const writesAfter = [...deps.writes];
      const second = await runBabyQuickCare(
        workspaceId,
        userSub,
        { ...shape.input, clientRequestId },
        deps,
      );
      assert.equal(second.replayed, true, shape.id);
      assert.deepEqual(
        second.steps.map((s) => s.step),
        first.steps.map((s) => s.step),
        shape.id,
      );
      assert.deepEqual(
        second.steps.map((s) => s.wrote),
        first.steps.map((s) => s.wrote),
        shape.id,
      );
      assert.deepEqual(deps.writes, writesAfter, shape.id);
    }
  });
});

describe("babyQuickCareNotifyKinds", () => {
  it("endNap is silent; feed notifies only on wrote insert", () => {
    assert.deepEqual(
      babyQuickCareNotifyKinds(
        [
          { step: "saveBreast", wrote: "insert" },
          { step: "endNap", wrote: "update" },
          { step: "createFormula", wrote: "update" },
        ],
        false,
      ),
      ["feed"],
    );
    assert.deepEqual(
      babyQuickCareNotifyKinds(
        [
          { step: "saveBreast", wrote: "update" },
          { step: "createFormula", wrote: "update" },
        ],
        false,
      ),
      [],
    );
  });

  it("replay and idle breast send zero notifies", () => {
    assert.deepEqual(
      babyQuickCareNotifyKinds([{ step: "createDiaper" }], true),
      [],
    );
    assert.deepEqual(babyQuickCareNotifyKinds([], false), []);
  });
});

describe("babyQuickCare DIAPER payload", () => {
  it("wet/dry write kind only; dirty without amount writes medium", async () => {
    const wetDeps = makeDeps({ napOpen: false });
    await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "DIAPER", diaperKind: "wet" },
        breastRunning: null,
        clientRequestId: "req-diaper-wet-1",
      },
      wetDeps,
    );
    const wetRow = wetDeps.rows.find((r) => r.type === "diaper")!;
    assert.deepEqual(wetRow.payload, {
      kind: "wet",
      quickRequestId: "req-diaper-wet-1",
    });

    const dryDeps = makeDeps({ napOpen: false });
    await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "DIAPER", diaperKind: "dry" },
        breastRunning: null,
        clientRequestId: "req-diaper-dry-1",
      },
      dryDeps,
    );
    const dryRow = dryDeps.rows.find((r) => r.type === "diaper")!;
    assert.deepEqual(dryRow.payload, {
      kind: "dry",
      quickRequestId: "req-diaper-dry-1",
    });

    const dirtyDeps = makeDeps({ napOpen: false });
    await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: {
          kind: "DIAPER",
          diaperKind: "dirty",
          diaperColor: "yellow",
          diaperTexture: "soft",
        },
        breastRunning: null,
        clientRequestId: "req-diaper-dirty-1",
      },
      dirtyDeps,
    );
    const dirtyRow = dirtyDeps.rows.find((r) => r.type === "diaper")!;
    assert.deepEqual(dirtyRow.payload, {
      kind: "dirty",
      color: "yellow",
      texture: "soft",
      amount: "medium",
      quickRequestId: "req-diaper-dirty-1",
    });
  });

  it("dirty with amount keeps client amount", async () => {
    const deps = makeDeps({ napOpen: false });
    await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: {
          kind: "DIAPER",
          diaperKind: "mixed",
          diaperAmount: "blowout",
        },
        breastRunning: null,
        clientRequestId: "req-diaper-amt-1",
      },
      deps,
    );
    const row = deps.rows.find((r) => r.type === "diaper")!;
    assert.equal((row.payload as { amount: string }).amount, "blowout");
  });

  it("L → R → formula merges into one feed row", async () => {
    const deps = makeDeps({ napOpen: false });
    const first = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "BREAST", side: "breast_r" },
        breastRunning: { side: "breast_l", durationSec: 300 },
        clientRequestId: "req-merge-l-1",
      },
      deps,
    );
    assert.equal(first.steps[0]?.wrote, "insert");
    const sessionId = first.steps[0]!.event.id;

    const second = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "BREAST", side: "breast_l" },
        breastRunning: { side: "breast_r", durationSec: 120 },
        feedSessionEventId: sessionId,
        clientRequestId: "req-merge-r-1",
      },
      deps,
    );
    assert.equal(second.steps[0]?.wrote, "update");
    assert.equal(second.steps[0]?.event.id, sessionId);

    const third = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "FORMULA", amountMl: 90 },
        breastRunning: null,
        feedSessionEventId: sessionId,
        clientRequestId: "req-merge-f-1",
      },
      deps,
    );
    assert.equal(third.steps[0]?.wrote, "update");
    assert.equal(third.steps[0]?.event.id, sessionId);

    const feeds = deps.rows.filter((r) => r.type === "feed");
    assert.equal(feeds.length, 1);
    const payload = feeds[0]!.payload as {
      method: string;
      legs: Array<{ method: string }>;
      amountMl: number;
      durationSec: number;
    };
    assert.equal(payload.method, "breast_r");
    assert.equal(payload.amountMl, 90);
    assert.equal(payload.durationSec, 420);
    assert.equal(payload.legs.length, 3);
  });

  it("2A: breastRunning + FORMULA with no id → one row both legs", async () => {
    const deps = makeDeps({ napOpen: false });
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "FORMULA", amountMl: 90 },
        breastRunning: { side: "breast_l", durationSec: 300 },
        clientRequestId: "req-2a-omit-1",
      },
      deps,
    );
    assert.deepEqual(
      result.steps.map((s) => ({ step: s.step, wrote: s.wrote })),
      [
        { step: "saveBreast", wrote: "insert" },
        { step: "createFormula", wrote: "update" },
      ],
    );
    const feeds = deps.rows.filter((r) => r.type === "feed");
    assert.equal(feeds.length, 1);
    assert.equal(feeds[0]!.id, result.steps[0]!.event.id);
    assert.equal(feeds[0]!.id, result.steps[1]!.event.id);
    const legs = (feeds[0]!.payload as { legs: unknown[] }).legs;
    assert.equal(legs.length, 2);
  });

  it("2A: sticky non-mergeable id + breastRunning + FORMULA → one new row", async () => {
    const deps = makeDeps({ napOpen: false });
    const oldId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const oldOccurred = new Date(BABY_AUTO_FINALIZE_NOW - 7 * 60 * 60 * 1000);
    deps.rows.push({
      id: oldId,
      workspaceId,
      babyId,
      type: "feed",
      occurredAt: oldOccurred,
      endedAt: null,
      payload: { method: "breast_l", durationSec: 60 },
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
      updatedAt: oldOccurred,
    });
    const now = new Date(BABY_AUTO_FINALIZE_NOW);
    deps.now = () => now;

    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "FORMULA", amountMl: 90 },
        breastRunning: { side: "breast_r", durationSec: 100 },
        feedSessionEventId: oldId,
        clientRequestId: "req-2a-sticky-1",
      },
      deps,
    );
    assert.equal(result.steps[0]?.wrote, "insert");
    assert.notEqual(result.steps[0]?.event.id, oldId);
    const feeds = deps.rows.filter((r) => r.type === "feed");
    assert.equal(feeds.length, 2);
    const neu = feeds.find((r) => r.id !== oldId)!;
    assert.equal(
      (neu.payload as { legs: unknown[] }).legs.length,
      2,
    );
    const old = feeds.find((r) => r.id === oldId)!;
    assert.equal(
      (old.payload as { method: string }).method,
      "breast_l",
    );
  });

  it("open continuation merges when updatedAt >5 min but <6h", async () => {
    const deps = makeDeps({ napOpen: false });
    const sessionId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const touched = new Date(BABY_AUTO_FINALIZE_NOW - 10 * 60 * 1000);
    deps.rows.push({
      id: sessionId,
      workspaceId,
      babyId,
      type: "feed",
      occurredAt: touched,
      endedAt: null,
      payload: {
        method: "breast_l",
        durationSec: 200,
        legs: [{ method: "breast_l", durationSec: 200 }],
      },
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
      updatedAt: touched,
    });
    deps.now = () => new Date(BABY_AUTO_FINALIZE_NOW);

    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "BREAST", side: "breast_r" },
        breastRunning: { side: "breast_r", durationSec: 80 },
        feedSessionEventId: sessionId,
        clientRequestId: "req-open-cont-1",
      },
      deps,
    );
    assert.equal(result.steps[0]?.wrote, "update");
    assert.equal(result.steps[0]?.event.id, sessionId);
    assert.equal(deps.rows.filter((r) => r.type === "feed").length, 1);
  });

  it("open continuation past 6h inserts new feed", async () => {
    const deps = makeDeps({ napOpen: false });
    const sessionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const touched = new Date(
      BABY_AUTO_FINALIZE_NOW - 6 * 60 * 60 * 1000 - 1000,
    );
    deps.rows.push({
      id: sessionId,
      workspaceId,
      babyId,
      type: "feed",
      occurredAt: touched,
      endedAt: null,
      payload: { method: "breast_l", durationSec: 50 },
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
      updatedAt: touched,
    });
    deps.now = () => new Date(BABY_AUTO_FINALIZE_NOW);

    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "BREAST", side: "breast_l" },
        breastRunning: { side: "breast_l", durationSec: 40 },
        feedSessionEventId: sessionId,
        clientRequestId: "req-past-6h-1",
      },
      deps,
    );
    assert.equal(result.steps[0]?.wrote, "insert");
    assert.notEqual(result.steps[0]?.event.id, sessionId);
    assert.equal(deps.rows.filter((r) => r.type === "feed").length, 2);
  });

  it("diaper ignores leftover feedSessionEventId", async () => {
    const deps = makeDeps({ napOpen: false });
    const feedId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    deps.rows.push({
      id: feedId,
      workspaceId,
      babyId,
      type: "feed",
      occurredAt: new Date(BABY_AUTO_FINALIZE_NOW),
      endedAt: null,
      payload: { method: "formula", amountMl: 10 },
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
      updatedAt: new Date(BABY_AUTO_FINALIZE_NOW),
    });
    let findCalls = 0;
    const orig = deps.findCareEventById;
    deps.findCareEventById = async (ws, id) => {
      findCalls += 1;
      return orig(ws, id);
    };
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "DIAPER", diaperKind: "wet" },
        breastRunning: null,
        feedSessionEventId: feedId,
        clientRequestId: "req-diaper-ignore-id-1",
      },
      deps,
    );
    assert.equal(result.steps[0]?.step, "createDiaper");
    assert.equal(findCalls, 0);
    assert.equal(
      (deps.rows.find((r) => r.id === feedId)!.payload as { amountMl: number })
        .amountMl,
      10,
    );
  });

  it("sleep ignores leftover feedSessionEventId", async () => {
    const deps = makeDeps({ napOpen: false });
    const feedId = "10101010-1010-4101-8101-101010101010";
    deps.rows.push({
      id: feedId,
      workspaceId,
      babyId,
      type: "feed",
      occurredAt: new Date(BABY_AUTO_FINALIZE_NOW),
      endedAt: null,
      payload: { method: "formula", amountMl: 10 },
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
      updatedAt: new Date(BABY_AUTO_FINALIZE_NOW),
    });
    let findCalls = 0;
    const orig = deps.findCareEventById;
    deps.findCareEventById = async (ws, id) => {
      findCalls += 1;
      return orig(ws, id);
    };
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "SLEEP" },
        breastRunning: null,
        feedSessionEventId: feedId,
        clientRequestId: "req-sleep-ignore-id-1",
      },
      deps,
    );
    assert.equal(result.steps[0]?.step, "startNap");
    assert.equal(findCalls, 0);
    assert.equal(
      (deps.rows.find((r) => r.id === feedId)!.payload as { amountMl: number })
        .amountMl,
      10,
    );
  });

  it("bad session id matrix errors with no insert", async () => {
    const cases: Array<{
      id: string;
      label: string;
      row?: Partial<BabyCareEventRow> & { id: string };
    }> = [
      {
        id: "99999999-9999-4999-8999-999999999999",
        label: "missing",
      },
      {
        id: "14141414-1414-4141-8141-141414141414",
        label: "wrong-type-diaper",
        row: {
          id: "14141414-1414-4141-8141-141414141414",
          workspaceId,
          babyId,
          type: "diaper",
          occurredAt: new Date(BABY_AUTO_FINALIZE_NOW),
          endedAt: null,
          payload: { kind: "wet" },
          source: "web",
          createdByUserSub: userSub,
          updatedByUserSub: userSub,
          updatedAt: new Date(BABY_AUTO_FINALIZE_NOW),
        },
      },
      {
        id: "15151515-1515-4151-8151-151515151515",
        label: "wrong-type-sleep",
        row: {
          id: "15151515-1515-4151-8151-151515151515",
          workspaceId,
          babyId,
          type: "sleep",
          occurredAt: new Date(BABY_AUTO_FINALIZE_NOW),
          endedAt: null,
          payload: {},
          source: "web",
          createdByUserSub: userSub,
          updatedByUserSub: userSub,
          updatedAt: new Date(BABY_AUTO_FINALIZE_NOW),
        },
      },
      {
        id: "16161616-1616-4161-8161-161616161616",
        label: "wrong-baby",
        row: {
          id: "16161616-1616-4161-8161-161616161616",
          workspaceId,
          babyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          type: "feed",
          occurredAt: new Date(BABY_AUTO_FINALIZE_NOW),
          endedAt: null,
          payload: { method: "formula", amountMl: 10 },
          source: "web",
          createdByUserSub: userSub,
          updatedByUserSub: userSub,
          updatedAt: new Date(BABY_AUTO_FINALIZE_NOW),
        },
      },
      {
        id: "17171717-1717-4171-8171-171717171717",
        label: "foreign-workspace",
        row: {
          id: "17171717-1717-4171-8171-171717171717",
          workspaceId: "99999999-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          babyId,
          type: "feed",
          occurredAt: new Date(BABY_AUTO_FINALIZE_NOW),
          endedAt: null,
          payload: { method: "formula", amountMl: 10 },
          source: "web",
          createdByUserSub: userSub,
          updatedByUserSub: userSub,
          updatedAt: new Date(BABY_AUTO_FINALIZE_NOW),
        },
      },
    ];

    for (const c of cases) {
      const deps = makeDeps({ napOpen: false });
      if (c.row) {
        deps.rows.push(c.row as BabyCareEventRow);
      }
      const feedsBefore = deps.rows.filter((r) => r.type === "feed").length;
      await assert.rejects(
        () =>
          runBabyQuickCare(
            workspaceId,
            userSub,
            {
              action: { kind: "FORMULA", amountMl: 60 },
              breastRunning: null,
              feedSessionEventId: c.id,
              clientRequestId: `req-bad-id-${c.label}`,
            },
            deps,
          ),
        /NOT_FOUND/,
        c.label,
      );
      assert.equal(
        deps.rows.filter((r) => r.type === "feed").length,
        feedsBefore,
        c.label,
      );
    }
  });

  it("post-stop skew merges at 5.5 min when client still sends session id", async () => {
    const deps = makeDeps({ napOpen: false });
    const sessionId = "18181818-1818-4181-8181-181818181818";
    const touched = new Date(BABY_AUTO_FINALIZE_NOW - 5.5 * 60 * 1000);
    deps.rows.push({
      id: sessionId,
      workspaceId,
      babyId,
      type: "feed",
      occurredAt: touched,
      endedAt: null,
      payload: {
        method: "breast_l",
        durationSec: 100,
        legs: [{ method: "breast_l", durationSec: 100 }],
      },
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
      updatedAt: touched,
    });
    deps.now = () => new Date(BABY_AUTO_FINALIZE_NOW);
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "FORMULA", amountMl: 50 },
        breastRunning: null,
        feedSessionEventId: sessionId,
        clientRequestId: "req-skew-55-1",
      },
      deps,
    );
    assert.equal(result.steps[0]?.wrote, "update");
    assert.equal(result.steps[0]?.event.id, sessionId);
    assert.equal(deps.rows.filter((r) => r.type === "feed").length, 1);
  });

  it("post-stop grace expired inserts new feed", async () => {
    const deps = makeDeps({ napOpen: false });
    const sessionId = "12121212-1212-4121-8121-121212121212";
    const touched = new Date(BABY_AUTO_FINALIZE_NOW - 10 * 60 * 1000);
    deps.rows.push({
      id: sessionId,
      workspaceId,
      babyId,
      type: "feed",
      occurredAt: touched,
      endedAt: null,
      payload: { method: "breast_l", durationSec: 100 },
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
      updatedAt: touched,
    });
    deps.now = () => new Date(BABY_AUTO_FINALIZE_NOW);
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "FORMULA", amountMl: 50 },
        breastRunning: null,
        feedSessionEventId: sessionId,
        clientRequestId: "req-grace-exp-1",
      },
      deps,
    );
    assert.equal(result.steps[0]?.wrote, "insert");
    assert.notEqual(result.steps[0]?.event.id, sessionId);
  });

  it("merge keeps occurred_at and bumps updated_at", async () => {
    const deps = makeDeps({ napOpen: false });
    const sessionId = "13131313-1313-4131-8131-131313131313";
    const occurred = new Date(BABY_AUTO_FINALIZE_NOW - 60_000);
    deps.rows.push({
      id: sessionId,
      workspaceId,
      babyId,
      type: "feed",
      occurredAt: occurred,
      endedAt: null,
      payload: {
        method: "breast_l",
        durationSec: 60,
        legs: [{ method: "breast_l", durationSec: 60 }],
      },
      source: "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
      updatedAt: occurred,
    });
    const now = new Date(BABY_AUTO_FINALIZE_NOW);
    deps.now = () => now;
    await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "FORMULA", amountMl: 40 },
        breastRunning: null,
        feedSessionEventId: sessionId,
        clientRequestId: "req-times-1",
      },
      deps,
    );
    const row = deps.rows.find((r) => r.id === sessionId)!;
    assert.equal(row.occurredAt.getTime(), occurred.getTime());
    assert.equal(row.updatedAt?.getTime(), now.getTime());
  });
});

describe("runBabyQuickCare optional occurredAt/endedAt", () => {
  const CUSTOM = "2026-09-20T06:40:00.000+07:00";
  const CUSTOM_MS = Date.parse(CUSTOM);
  const OTHER = "2026-09-20T07:00:00.000+07:00";
  const OTHER_MS = Date.parse(OTHER);

  it("SLEEP start (no open nap) + occurredAt persists start time", async () => {
    const deps = makeDeps({ napOpen: false });
    const now = new Date(BABY_AUTO_FINALIZE_NOW);
    deps.now = () => now;
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "SLEEP" },
        breastRunning: null,
        clientRequestId: "req-sleep-start-custom",
        occurredAt: CUSTOM,
      },
      deps,
    );
    assert.equal(result.steps[0]?.step, "startNap");
    const nap = deps.rows.find((r) => r.type === "sleep")!;
    assert.equal(nap.occurredAt.getTime(), CUSTOM_MS);
    assert.notEqual(nap.occurredAt.getTime(), now.getTime());
  });

  it("DIAPER + occurredAt persists diaper time", async () => {
    const deps = makeDeps({ napOpen: false });
    const now = new Date(BABY_AUTO_FINALIZE_NOW);
    deps.now = () => now;
    await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "DIAPER", diaperKind: "wet" },
        breastRunning: null,
        clientRequestId: "req-diaper-custom",
        occurredAt: CUSTOM,
      },
      deps,
    );
    const diaper = deps.rows.find((r) => r.type === "diaper")!;
    assert.equal(diaper.occurredAt.getTime(), CUSTOM_MS);
  });

  it("DIAPER (no open nap) + only endedAt ignores end for insert", async () => {
    const deps = makeDeps({ napOpen: false });
    const now = new Date(BABY_AUTO_FINALIZE_NOW);
    deps.now = () => now;
    await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "DIAPER", diaperKind: "wet" },
        breastRunning: null,
        clientRequestId: "req-diaper-ended-only",
        endedAt: CUSTOM,
      },
      deps,
    );
    const diaper = deps.rows.find((r) => r.type === "diaper")!;
    assert.equal(diaper.occurredAt.getTime(), now.getTime());
    assert.notEqual(diaper.occurredAt.getTime(), CUSTOM_MS);
  });

  it("FORMULA with occurredAt persists that time; BREAST still server now", async () => {
    {
      const deps = makeDeps({ napOpen: false });
      const now = new Date(BABY_AUTO_FINALIZE_NOW);
      deps.now = () => now;
      await runBabyQuickCare(
        workspaceId,
        userSub,
        {
          action: { kind: "FORMULA", amountMl: 90 },
          breastRunning: null,
          clientRequestId: "req-formula-occurred",
          occurredAt: CUSTOM,
        },
        deps,
      );
      const feed = deps.rows.find((r) => r.type === "feed")!;
      assert.equal(feed.occurredAt.getTime(), CUSTOM_MS);
    }
    {
      const deps = makeDeps({ napOpen: false });
      const now = new Date(BABY_AUTO_FINALIZE_NOW);
      deps.now = () => now;
      await runBabyQuickCare(
        workspaceId,
        userSub,
        {
          action: { kind: "PUMP_AMOUNT", amountMl: 60 },
          breastRunning: null,
          clientRequestId: "req-pump-occurred",
          occurredAt: CUSTOM,
        },
        deps,
      );
      const feed = deps.rows.find((r) => r.type === "feed")!;
      assert.equal(feed.occurredAt.getTime(), CUSTOM_MS);
    }
    {
      const deps = makeDeps({ napOpen: false });
      const now = new Date(BABY_AUTO_FINALIZE_NOW);
      deps.now = () => now;
      await runBabyQuickCare(
        workspaceId,
        userSub,
        {
          action: { kind: "BREAST", side: "breast_l" },
          breastRunning: {
            side: "breast_l",
            durationSec: 45,
          },
          clientRequestId: "req-breast-ignore",
          occurredAt: CUSTOM,
          endedAt: OTHER,
        },
        deps,
      );
      const feed = deps.rows.find((r) => r.type === "feed")!;
      assert.equal(feed.occurredAt.getTime(), now.getTime());
    }
  });

  it("open nap + SLEEP + only occurredAt ends nap at server now", async () => {
    const deps = makeDeps({ napOpen: true });
    const now = new Date(BABY_AUTO_FINALIZE_NOW);
    deps.now = () => now;
    const result = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "SLEEP" },
        breastRunning: null,
        clientRequestId: "req-sleep-end-occurred-only",
        occurredAt: CUSTOM,
      },
      deps,
    );
    assert.equal(result.steps[0]?.step, "endNap");
    const nap = deps.rows.find((r) => r.id === "nap-open-1")!;
    assert.equal(nap.endedAt?.getTime(), now.getTime());
    assert.notEqual(nap.endedAt?.getTime(), CUSTOM_MS);
  });

  it("open nap + SLEEP + endedAt ends nap at that end time", async () => {
    const deps = makeDeps({ napOpen: true });
    const now = new Date(BABY_AUTO_FINALIZE_NOW);
    deps.now = () => now;
    await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "SLEEP" },
        breastRunning: null,
        clientRequestId: "req-sleep-end-custom",
        endedAt: CUSTOM,
        occurredAt: OTHER,
      },
      deps,
    );
    const nap = deps.rows.find((r) => r.id === "nap-open-1")!;
    assert.equal(nap.endedAt?.getTime(), CUSTOM_MS);
    assert.notEqual(nap.endedAt?.getTime(), OTHER_MS);
  });

  it("open nap + DIAPER auto-endNap uses endedAt else occurredAt else now", async () => {
    // endedAt wins
    {
      const deps = makeDeps({ napOpen: true });
      const now = new Date(BABY_AUTO_FINALIZE_NOW);
      deps.now = () => now;
      await runBabyQuickCare(
        workspaceId,
        userSub,
        {
          action: { kind: "DIAPER", diaperKind: "wet" },
          breastRunning: null,
          clientRequestId: "req-auto-end-ended",
          endedAt: CUSTOM,
          occurredAt: OTHER,
        },
        deps,
      );
      const nap = deps.rows.find((r) => r.id === "nap-open-1")!;
      assert.equal(nap.endedAt?.getTime(), CUSTOM_MS);
    }
    // occurredAt when no endedAt
    {
      const deps = makeDeps({ napOpen: true });
      const now = new Date(BABY_AUTO_FINALIZE_NOW);
      deps.now = () => now;
      await runBabyQuickCare(
        workspaceId,
        userSub,
        {
          action: { kind: "DIAPER", diaperKind: "wet" },
          breastRunning: null,
          clientRequestId: "req-auto-end-occurred",
          occurredAt: CUSTOM,
        },
        deps,
      );
      const nap = deps.rows.find((r) => r.id === "nap-open-1")!;
      assert.equal(nap.endedAt?.getTime(), CUSTOM_MS);
    }
    // now when neither
    {
      const deps = makeDeps({ napOpen: true });
      const now = new Date(BABY_AUTO_FINALIZE_NOW);
      deps.now = () => now;
      await runBabyQuickCare(
        workspaceId,
        userSub,
        {
          action: { kind: "DIAPER", diaperKind: "wet" },
          breastRunning: null,
          clientRequestId: "req-auto-end-now",
        },
        deps,
      );
      const nap = deps.rows.find((r) => r.id === "nap-open-1")!;
      assert.equal(nap.endedAt?.getTime(), now.getTime());
    }
  });

  it("same clientRequestId + different times replays first write", async () => {
    const deps = makeDeps({ napOpen: false });
    const now = new Date(BABY_AUTO_FINALIZE_NOW);
    deps.now = () => now;
    const first = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "DIAPER", diaperKind: "wet" },
        breastRunning: null,
        clientRequestId: "req-replay-times",
        occurredAt: CUSTOM,
      },
      deps,
    );
    assert.equal(first.replayed, false);
    const firstAt = deps.rows.find((r) => r.type === "diaper")!.occurredAt;

    const second = await runBabyQuickCare(
      workspaceId,
      userSub,
      {
        action: { kind: "DIAPER", diaperKind: "wet" },
        breastRunning: null,
        clientRequestId: "req-replay-times",
        occurredAt: OTHER,
      },
      deps,
    );
    assert.equal(second.replayed, true);
    assert.equal(deps.writes.length, 1);
    assert.equal(
      second.steps[0]?.event.occurredAt.getTime(),
      firstAt.getTime(),
    );
    assert.equal(firstAt.getTime(), CUSTOM_MS);
  });
});
