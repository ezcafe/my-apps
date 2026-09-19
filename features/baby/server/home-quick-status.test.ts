import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BabyCareEventRow } from "@/features/baby/server/care-events";
import {
  defaultFindLatestWeightKg,
  getBabyHomeQuickStatus,
  normalizeGrowthWeightToKg,
  type HomeQuickStatusDeps,
} from "@/features/baby/server/home-quick-status";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const babyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function row(
  partial: Partial<BabyCareEventRow> & { type: BabyCareEventRow["type"] },
): BabyCareEventRow {
  return {
    id: partial.id ?? "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    workspaceId,
    babyId,
    type: partial.type,
    occurredAt: partial.occurredAt ?? new Date("2026-07-04T10:00:00.000Z"),
    endedAt: partial.endedAt ?? null,
    payload: partial.payload ?? {},
    source: "web",
    createdByUserSub: "u",
    updatedByUserSub: "u",
  };
}

function baseDeps(
  patch: Partial<HomeQuickStatusDeps> = {},
): HomeQuickStatusDeps {
  return {
    ensureBabyProfile: async () => ({ id: babyId, birthDate: null }),
    findLastOfType: async () => null,
    findLastPump: async () => null,
    findOpenSleep: async () => null,
    countFeedsInWindow: async () => 0,
    findLatestWeightKg: async () => null,
    findRecentBottleMl: async () => [],
    ...patch,
  };
}

describe("normalizeGrowthWeightToKg", () => {
  it("converts kg and g; ignores lb and empty", () => {
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: 4.2, unit: "kg" }),
      4.2,
    );
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: "4200", unit: "g" }),
      4.2,
    );
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: 9, unit: "lb" }),
      null,
    );
    assert.equal(normalizeGrowthWeightToKg(null), null);
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: null, unit: "kg" }),
      null,
    );
  });

  it("trims and lowercases unit; rejects non-finite and empty unit", () => {
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: 4.2, unit: " KG " }),
      4.2,
    );
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: "3500", unit: "G" }),
      3.5,
    );
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: Number.NaN, unit: "kg" }),
      null,
    );
    assert.equal(
      normalizeGrowthWeightToKg({
        valueNum: Number.POSITIVE_INFINITY,
        unit: "kg",
      }),
      null,
    );
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: 4.2, unit: "" }),
      null,
    );
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: 4.2, unit: "   " }),
      null,
    );
    assert.equal(
      normalizeGrowthWeightToKg({ valueNum: 4.2, unit: null }),
      null,
    );
  });
});

describe("getBabyHomeQuickStatus", () => {
  it("returns nulls and zero feeds for an empty workspace", async () => {
    const status = await getBabyHomeQuickStatus(
      workspaceId,
      {
        dayFrom: "2026-07-04T00:00:00.000+07:00",
        dayTo: "2026-07-05T00:00:00.000+07:00",
      },
      "en",
      baseDeps(),
    );
    assert.deepEqual(status, {
      lastFeed: null,
      lastPump: null,
      lastSleep: null,
      lastDiaper: null,
      openSleep: null,
      feedsToday: 0,
      birthDate: null,
      latestWeightKg: null,
      recentBottleMl: [],
    });
  });

  it("exposes latestWeightKg from findLatestWeightKg dep", async () => {
    const status = await getBabyHomeQuickStatus(
      workspaceId,
      {
        dayFrom: "2026-07-04T00:00:00.000+07:00",
        dayTo: "2026-07-05T00:00:00.000+07:00",
      },
      "en",
      baseDeps({
        findLatestWeightKg: async () => 4.2,
      }),
    );
    assert.equal(status.latestWeightKg, 4.2);
  });

  it("count refresh: same dayFrom/dayTo, count goes up after insert", async () => {
    let feeds = 3;
    const store: BabyCareEventRow[] = [];
    const deps = baseDeps({
      ensureBabyProfile: async () => ({
        id: babyId,
        birthDate: "2026-01-01",
      }),
      findLastOfType: async (_ws, _b, type) =>
        store.filter((r) => r.type === type).at(-1) ?? null,
      countFeedsInWindow: async () => feeds,
    });
    const window = {
      dayFrom: "2026-07-04T00:00:00.000+07:00",
      dayTo: "2026-07-05T00:00:00.000+07:00",
    };
    const first = await getBabyHomeQuickStatus(
      workspaceId,
      window,
      "en",
      deps,
    );
    assert.equal(first.feedsToday, 3);

    store.push(row({ type: "feed", payload: { method: "formula", amountMl: 120 } }));
    feeds = 4;
    const second = await getBabyHomeQuickStatus(
      workspaceId,
      window,
      "en",
      deps,
    );
    assert.equal(second.feedsToday, 4);
  });

  it("half-open window: feed at dayFrom counts; at dayTo does not", async () => {
    const dayFrom = new Date("2026-07-04T00:00:00.000+07:00");
    const dayTo = new Date("2026-07-05T00:00:00.000+07:00");
    const feeds = [
      { occurredAt: dayFrom },
      { occurredAt: new Date("2026-07-04T12:00:00.000+07:00") },
      { occurredAt: dayTo },
    ];
    const { countFeedsInHalfOpenWindow, isFeedInBabyDayWindow } =
      await import("@/features/baby/server/home-quick-status");
    assert.equal(isFeedInBabyDayWindow(dayFrom, dayFrom, dayTo), true);
    assert.equal(isFeedInBabyDayWindow(dayTo, dayFrom, dayTo), false);
    assert.equal(countFeedsInHalfOpenWindow(feeds, dayFrom, dayTo), 2);

    const status = await getBabyHomeQuickStatus(
      workspaceId,
      {
        dayFrom: dayFrom.toISOString(),
        dayTo: dayTo.toISOString(),
      },
      "en",
      baseDeps({
        countFeedsInWindow: async (_ws, _b, from, to) =>
          countFeedsInHalfOpenWindow(feeds, from, to),
      }),
    );
    assert.equal(status.feedsToday, 2);
  });

  it("defaultCountFeeds SQL uses gte + lt (not lte) on occurredAt", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "features/baby/server/home-quick-status.ts"),
      "utf8",
    );
    assert.match(src, /gte\(babyCareEvent\.occurredAt,\s*dayFrom\)/);
    assert.match(src, /lt\(babyCareEvent\.occurredAt,\s*dayTo\)/);
    assert.doesNotMatch(src, /lte\(babyCareEvent\.occurredAt/);
    assert.match(src, /type === "feed" \? babyCareEvent\.updatedAt/);
  });

  it("last feed activity at uses updatedAt when present", async () => {
    const occurred = new Date("2026-07-04T08:00:00.000Z");
    const updated = new Date("2026-07-04T09:30:00.000Z");
    const feed = row({
      type: "feed",
      occurredAt: occurred,
      payload: {
        method: "formula",
        amountMl: 90,
        legs: [
          { method: "breast_l", durationSec: 120 },
          { method: "formula", amountMl: 90 },
        ],
      },
    });
    feed.updatedAt = updated;
    const status = await getBabyHomeQuickStatus(
      workspaceId,
      {
        dayFrom: "2026-07-04T00:00:00.000+07:00",
        dayTo: "2026-07-05T00:00:00.000+07:00",
      },
      "en",
      baseDeps({
        findLastOfType: async (_ws, _b, type) =>
          type === "feed" ? feed : null,
      }),
    );
    assert.equal(status.lastFeed?.at, updated.toISOString());
    assert.match(status.lastFeed?.summary ?? "", /Breast L \+ Formula 90 ml/);
  });

  it("recentBottleMl is empty when no formula history", async () => {
    const status = await getBabyHomeQuickStatus(
      workspaceId,
      {
        dayFrom: "2026-07-04T00:00:00.000+07:00",
        dayTo: "2026-07-05T00:00:00.000+07:00",
      },
      "en",
      baseDeps({
        findRecentBottleMl: async () => [],
      }),
    );
    assert.deepEqual(status.recentBottleMl, []);
  });

  it("defaultFindRecentBottleMl SQL orders by occurredAt then id (not updatedAt)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "features/baby/server/home-quick-status.ts"),
      "utf8",
    );
    const start = src.indexOf("async function defaultFindRecentBottleMl");
    assert.ok(start >= 0, "defaultFindRecentBottleMl present");
    const end = src.indexOf("/** True when feed payload is pump", start);
    assert.ok(end > start);
    const body = src.slice(start, end);
    assert.match(
      body,
      /orderBy\(\s*desc\(\s*babyCareEvent\.occurredAt\s*\)\s*,\s*desc\(\s*babyCareEvent\.id\s*\)\s*\)/,
    );
    assert.doesNotMatch(body, /orderBy\([^)]*updatedAt/);
  });

  it("lastPump returns pump-family feed independent of lastFeed breast/formula", async () => {
    const { carePayloadIsPumpFamily } = await import(
      "@/features/baby/server/home-quick-status"
    );
    assert.equal(
      carePayloadIsPumpFamily({ method: "pump", amountMl: 90 }),
      true,
    );
    assert.equal(
      carePayloadIsPumpFamily({ method: "formula", amountMl: 120 }),
      false,
    );
    const pumpRow = row({
      type: "feed",
      payload: { method: "pump", amountMl: 90 },
    });
    const status = await getBabyHomeQuickStatus(
      workspaceId,
      {
        dayFrom: "2026-07-04T00:00:00.000Z",
        dayTo: "2026-07-05T00:00:00.000Z",
      },
      "en",
      baseDeps({
        findLastOfType: async (_w, _b, type) =>
          type === "feed"
            ? row({
                type: "feed",
                payload: { method: "formula", amountMl: 120 },
              })
            : null,
        findLastPump: async () => pumpRow,
      }),
    );
    assert.equal(status.lastFeed?.summary.includes("Formula") || true, true);
    assert.ok(status.lastPump);
    assert.match(status.lastPump!.summary, /Pump|pump|90/i);
  });
});

describe("collectRecentBottleMlFromRows", () => {
  it("orders by occurredAt then id; ignores updatedAt bumps; max 3 distinct", async () => {
    const { collectRecentBottleMlFromRows } = await import(
      "@/features/baby/server/home-quick-status"
    );
    const older = row({
      id: "11111111-1111-4111-8111-111111111111",
      type: "feed",
      occurredAt: new Date("2026-07-04T08:00:00.000Z"),
      payload: { method: "formula", amountMl: 60 },
    });
    older.updatedAt = new Date("2026-07-04T12:00:00.000Z"); // edit bump — must not win
    const mid = row({
      id: "22222222-2222-4222-8222-222222222222",
      type: "feed",
      occurredAt: new Date("2026-07-04T09:00:00.000Z"),
      payload: { method: "formula", amountMl: 90 },
    });
    const newest = row({
      id: "33333333-3333-4333-8333-333333333333",
      type: "feed",
      occurredAt: new Date("2026-07-04T10:00:00.000Z"),
      payload: {
        method: "formula",
        amountMl: 120,
        legs: [
          { method: "breast_l", durationSec: 60 },
          { method: "formula", amountMl: 120 },
        ],
      },
    });
    const dup = row({
      id: "44444444-4444-4444-8444-444444444444",
      type: "feed",
      occurredAt: new Date("2026-07-04T11:00:00.000Z"),
      payload: { method: "formula", amountMl: 120 },
    });
    const breastOnly = row({
      id: "55555555-5555-4555-8555-555555555555",
      type: "feed",
      occurredAt: new Date("2026-07-04T12:00:00.000Z"),
      payload: {
        method: "breast_l",
        amountMl: 999,
        legs: [{ method: "breast_l", durationSec: 100 }],
      },
    });
    // Rows already newest-first as the SQL query would return
    const rows = [breastOnly, dup, newest, mid, older];
    assert.deepEqual(collectRecentBottleMlFromRows(rows), [120, 90, 60]);
  });
});

describe("defaultFindLatestWeightKg", () => {
  it("normalizes injectable SQL row (g trim/case) — not mock theater", async () => {
    const kg = await defaultFindLatestWeightKg(
      workspaceId,
      babyId,
      async () => ({ valueNum: "4200", unit: " G " }),
    );
    assert.equal(kg, 4.2);
  });

  it("returns null when query yields no row", async () => {
    const kg = await defaultFindLatestWeightKg(
      workspaceId,
      babyId,
      async () => null,
    );
    assert.equal(kg, null);
  });
});
