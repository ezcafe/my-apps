import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVITY_LOG_DELETE_CONCURRENCY,
  activityLogDeleteInvalidateScope,
  activityLogDeleteSettleAlert,
  activityLogDisplaySummary,
  activityLogRowTitleKey,
  activityLogSelectionKey,
  activitySelectionBarEditEnabled,
  mapAllSettledWithConcurrency,
  mergeActivityLogRows,
  parseActivityLogSelectionKey,
  pruneActivityLogSelectionAfterDeletes,
  pruneActivityLogSelectionToLoadedKeys,
  activityLogDeleteTargetsFromKeys,
  activityLogStillVisibleSelectionKeys,
} from "@/lib/baby-insights-activity-log";
import { activityEditMutationFor } from "@/lib/baby-insights-activity-edit";

describe("mergeActivityLogRows", () => {
  it("merges care + growth sorted newest-first with editTarget", () => {
    const rows = mergeActivityLogRows(
      [
        {
          id: "c1",
          kind: "care",
          type: "feed",
          at: "2026-09-14T10:00:00.000Z",
          summary: "Feed",
          payload: { method: "formula", amountMl: 90 },
        },
      ],
      [
        {
          id: "g1",
          kind: "weight",
          recordedAt: "2026-09-14T12:00:00.000Z",
          valueNum: 4.2,
          valueText: null,
          unit: "kg",
          notes: null,
        },
      ],
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.source, "growth");
    assert.equal(rows[0]!.editTarget.source, "growth");
    assert.equal(rows[1]!.source, "care");
    assert.equal(rows[1]!.editTarget.source, "care");
    assert.equal(rows[1]!.careType, "feed");
    assert.equal(activityLogRowTitleKey(rows[0]!), "growth.weight");
    assert.equal(activityLogRowTitleKey(rows[1]!), "insights.chipFeed");
  });

  it("merges vaccine rows with care and growth", () => {
    const rows = mergeActivityLogRows(
      [],
      [
        {
          id: "g1",
          kind: "weight",
          recordedAt: "2026-09-14T10:00:00.000Z",
          valueNum: 4,
          valueText: null,
          unit: "kg",
          notes: null,
        },
      ],
      [
        {
          id: "v1",
          name: "Hexaxim",
          dose: "first",
          administeredAt: "2026-09-14T12:00:00.000Z",
        },
      ],
      { vaccineDoseLabel: (d) => (d === "first" ? "First" : "Second") },
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.source, "vaccine");
    assert.equal(rows[0]!.summary, "Hexaxim · First");
    assert.equal(activityLogRowTitleKey(rows[0]!), "growth.vaccine");
    assert.equal(rows[0]!.editTarget.source, "vaccine");
  });

  it("maps vitamin and pump growth kinds to i18n title keys", () => {
    assert.equal(
      activityLogRowTitleKey({
        source: "growth",
        growthKind: "vitamin",
      }),
      "growth.vitamin",
    );
    assert.equal(
      activityLogRowTitleKey({
        source: "growth",
        growthKind: "pump",
      }),
      "growth.pump",
    );
  });

  it("summarizes temperature symptoms without raw JSON notes", () => {
    const rows = mergeActivityLogRows(
      [],
      [
        {
          id: "t1",
          kind: "temperature",
          recordedAt: "2026-09-14T12:00:00.000Z",
          valueNum: null,
          valueText: null,
          unit: null,
          notes: JSON.stringify({ v: 1, symptoms: ["rash"] }),
        },
      ],
    );
    assert.equal(rows[0]!.summary, "Rash");
    assert.doesNotMatch(rows[0]!.summary, /\{|"v":/);
  });

  it("summarizes vitamin by name, not notes", () => {
    const rows = mergeActivityLogRows(
      [],
      [
        {
          id: "v1",
          kind: "vitamin",
          recordedAt: "2026-09-14T12:00:00.000Z",
          valueNum: null,
          valueText: "Vitamin D",
          unit: null,
          notes: null,
        },
      ],
    );
    assert.equal(rows[0]!.summary, "Vitamin D");
  });

  it("localizes temperature symptoms in activityLogDisplaySummary", () => {
    const rows = mergeActivityLogRows(
      [],
      [
        {
          id: "t1",
          kind: "temperature",
          recordedAt: "2026-09-14T12:00:00.000Z",
          valueNum: null,
          valueText: null,
          unit: null,
          notes: JSON.stringify({ v: 1, symptoms: ["rash"] }),
        },
      ],
    );
    const display = activityLogDisplaySummary(rows[0]!, (key) =>
      key === "growth.symptom.rash" ? "Phát ban" : key,
    );
    assert.equal(display, "Phát ban");
    assert.doesNotMatch(display, /\{|"v":/);
  });
});

describe("activityLogSelectionKey", () => {
  it("care and growth keys differ for the same uuid string", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const care = activityLogSelectionKey({ source: "care", id });
    const growth = activityLogSelectionKey({ source: "growth", id });
    assert.notEqual(care, growth);
    assert.match(care, /^care:/);
    assert.match(growth, /^growth:/);
  });

  it("round-trips encode + parse", () => {
    const target = { source: "care" as const, id: "c-abc" };
    assert.deepEqual(
      parseActivityLogSelectionKey(activityLogSelectionKey(target)),
      target,
    );
  });

  it("parse returns null for garbage", () => {
    assert.equal(parseActivityLogSelectionKey(""), null);
    assert.equal(parseActivityLogSelectionKey("care"), null);
    assert.equal(parseActivityLogSelectionKey("feed:x"), null);
    assert.equal(parseActivityLogSelectionKey("care:"), null);
  });
});

describe("activitySelectionBarEditEnabled", () => {
  it("multi-Edit is intentionally blocked except when count === 1", () => {
    assert.equal(activitySelectionBarEditEnabled(0), false);
    assert.equal(activitySelectionBarEditEnabled(1), true);
    assert.equal(activitySelectionBarEditEnabled(2), false);
    assert.equal(activitySelectionBarEditEnabled(99), false);
  });
});

describe("pruneActivityLogSelectionAfterDeletes", () => {
  it("drops fulfilled keys and keeps rejected keys still on screen", () => {
    const care = activityLogSelectionKey({ source: "care", id: "c1" });
    const growth = activityLogSelectionKey({ source: "growth", id: "g1" });
    const selected = new Set([care, growth]);
    const next = pruneActivityLogSelectionAfterDeletes(
      selected,
      [
        { key: care, ok: true },
        { key: growth, ok: false },
      ],
      new Set([care, growth]),
    );
    assert.equal(next.size, 1);
    assert.ok(next.has(growth));
    assert.equal(next.has(care), false);
  });

  it("drops failed keys that are no longer visible", () => {
    const care = activityLogSelectionKey({ source: "care", id: "c1" });
    const next = pruneActivityLogSelectionAfterDeletes(
      new Set([care]),
      [{ key: care, ok: false }],
      new Set(),
    );
    assert.equal(next.size, 0);
  });

  it("builds stillVisible from post-refresh rows (not pre-delete snapshot)", () => {
    const care = activityLogSelectionKey({ source: "care", id: "c1" });
    const growth = activityLogSelectionKey({ source: "growth", id: "g1" });
    // Simulate post-invalidate list: failed growth row already gone from server.
    const stillVisible = activityLogStillVisibleSelectionKeys([
      { editTarget: { source: "care", id: "c1" } },
    ]);
    assert.equal(stillVisible.has(growth), false);
    const next = pruneActivityLogSelectionAfterDeletes(
      new Set([care, growth]),
      [
        { key: care, ok: true },
        { key: growth, ok: false },
      ],
      stillVisible,
    );
    assert.equal(next.size, 0);
  });

  it("drops succeeded keys when stillVisible is pre-refresh (invalidate threw)", () => {
    const care = activityLogSelectionKey({ source: "care", id: "c1" });
    const growth = activityLogSelectionKey({ source: "growth", id: "g1" });
    // Invalidate failed — list still shows both rows, but settle says care deleted.
    const stillVisible = new Set([care, growth]);
    const next = pruneActivityLogSelectionAfterDeletes(
      new Set([care, growth]),
      [
        { key: care, ok: true },
        { key: growth, ok: false },
      ],
      stillVisible,
    );
    assert.equal(next.size, 1);
    assert.ok(next.has(growth));
  });
});

describe("pruneActivityLogSelectionToLoadedKeys", () => {
  it("drops keys removed by sync truncate while keeping loaded keys", () => {
    const kept = activityLogSelectionKey({ source: "care", id: "page1" });
    const orphan = activityLogSelectionKey({ source: "care", id: "page2" });
    const growth = activityLogSelectionKey({ source: "growth", id: "g1" });
    const next = pruneActivityLogSelectionToLoadedKeys(
      new Set([kept, orphan, growth]),
      new Set([kept, growth]),
    );
    assert.equal(next.size, 2);
    assert.ok(next.has(kept));
    assert.ok(next.has(growth));
    assert.equal(next.has(orphan), false);
  });

  it("returns empty Set when selection is empty", () => {
    assert.equal(
      pruneActivityLogSelectionToLoadedKeys(new Set(), new Set(["care:x"]))
        .size,
      0,
    );
  });
});

describe("activityLogDeleteSettleAlert", () => {
  const copy = { allFail: "all", partialFail: "partial" };

  it("returns null when every settle fulfilled", () => {
    assert.equal(
      activityLogDeleteSettleAlert([{ ok: true }, { ok: true }], copy),
      null,
    );
  });

  it("returns allFail when every settle rejected", () => {
    assert.equal(
      activityLogDeleteSettleAlert([{ ok: false }, { ok: false }], copy),
      "all",
    );
  });

  it("returns partialFail when mixed", () => {
    assert.equal(
      activityLogDeleteSettleAlert([{ ok: true }, { ok: false }], copy),
      "partial",
    );
  });
});

describe("activityLogDeleteTargetsFromKeys", () => {
  it("maps mixed care+growth keys to delete mutations", () => {
    const care = activityLogSelectionKey({ source: "care", id: "c1" });
    const growth = activityLogSelectionKey({ source: "growth", id: "g1" });
    const targets = activityLogDeleteTargetsFromKeys([care, growth]);
    assert.deepEqual(targets, [
      { source: "care", id: "c1" },
      { source: "growth", id: "g1" },
    ]);
    assert.equal(activityEditMutationFor(targets[0]!, "delete"), "deleteBabyEvent");
    assert.equal(
      activityEditMutationFor(targets[1]!, "delete"),
      "deleteBabyGrowth",
    );
  });
});

describe("mapAllSettledWithConcurrency", () => {
  it("exports a pool size under Baby GraphQL default RPM (60)", () => {
    assert.ok(ACTIVITY_LOG_DELETE_CONCURRENCY >= 4);
    assert.ok(ACTIVITY_LOG_DELETE_CONCURRENCY <= 8);
  });

  it("never runs more than limit tasks in flight", async () => {
    const limit = 3;
    const n = 12;
    let inFlight = 0;
    let peak = 0;
    const order: number[] = [];

    const results = await mapAllSettledWithConcurrency(
      Array.from({ length: n }, (_, i) => i),
      limit,
      async (i) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        order.push(i);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        if (i === 7) throw new Error("boom");
        return i * 2;
      },
    );

    assert.ok(peak <= limit, `peak in-flight ${peak} exceeded limit ${limit}`);
    assert.equal(results.length, n);
    assert.equal(results[0]?.status, "fulfilled");
    assert.equal(
      results[0]?.status === "fulfilled" ? results[0].value : null,
      0,
    );
    assert.equal(results[7]?.status, "rejected");
    assert.deepEqual(
      order.slice().sort((a, b) => a - b),
      Array.from({ length: n }, (_, i) => i),
    );
  });

  it("returns empty array for empty input", async () => {
    const results = await mapAllSettledWithConcurrency(
      [],
      4,
      async () => 1,
    );
    assert.deepEqual(results, []);
  });
});

describe("activityLogDeleteInvalidateScope", () => {
  it("returns care when every target is care", () => {
    assert.equal(
      activityLogDeleteInvalidateScope([
        { source: "care", id: "c1" },
        { source: "care", id: "c2" },
      ]),
      "care",
    );
  });

  it("returns growth when every target is growth", () => {
    assert.equal(
      activityLogDeleteInvalidateScope([{ source: "growth", id: "g1" }]),
      "growth",
    );
  });

  it("returns growth for mixed care+growth (growth scope covers timeline)", () => {
    assert.equal(
      activityLogDeleteInvalidateScope([
        { source: "care", id: "c1" },
        { source: "growth", id: "g1" },
      ]),
      "growth",
    );
  });

  it("returns vaccines for vaccine-only deletes", () => {
    assert.equal(
      activityLogDeleteInvalidateScope([{ source: "vaccine", id: "v1" }]),
      "vaccines",
    );
  });

  it("returns all when vaccine mixes with other sources", () => {
    assert.equal(
      activityLogDeleteInvalidateScope([
        { source: "growth", id: "g1" },
        { source: "vaccine", id: "v1" },
      ]),
      "all",
    );
  });
});
