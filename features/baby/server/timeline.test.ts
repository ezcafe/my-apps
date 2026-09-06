import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  careSummary,
  decodeBabyTimelineCursor,
  encodeBabyTimelineCursor,
  mergeAndPageBabyTimeline,
  mergeKeysetSources,
  type BabyTimelineItem,
} from "@/features/baby/server/timeline";

function item(
  partial: Pick<BabyTimelineItem, "id" | "kind" | "type" | "at"> &
    Partial<BabyTimelineItem>,
): BabyTimelineItem {
  const atMs = Date.parse(partial.at);
  return {
    endedAt: null,
    payload: {},
    summary: partial.type,
    source: "web",
    cursor: encodeBabyTimelineCursor(atMs, partial.id),
    ...partial,
  };
}

describe("baby timeline cursor", () => {
  it("round-trips encode/decode", () => {
    const encoded = encodeBabyTimelineCursor(1_700_000_000_000, "abc");
    assert.deepEqual(decodeBabyTimelineCursor(encoded), {
      atMs: 1_700_000_000_000,
      id: "abc",
    });
  });

  it("bad cursor → null", () => {
    assert.equal(decodeBabyTimelineCursor("!!!"), null);
    assert.equal(decodeBabyTimelineCursor("not-base64"), null);
  });
});

describe("mergeAndPageBabyTimeline", () => {
  it("merges care+growth sorted time desc", () => {
    const page = mergeAndPageBabyTimeline(
      [
        item({
          id: "c1",
          kind: "care",
          type: "feed",
          at: "2026-09-06T10:00:00.000Z",
        }),
        item({
          id: "g1",
          kind: "growth",
          type: "weight",
          at: "2026-09-06T12:00:00.000Z",
        }),
        item({
          id: "c2",
          kind: "care",
          type: "diaper",
          at: "2026-09-06T11:00:00.000Z",
        }),
      ],
      { limit: 10 },
    );
    assert.deepEqual(
      page.items.map((i) => i.id),
      ["g1", "c2", "c1"],
    );
    assert.equal(page.nextCursor, null);
  });

  it("pages with cursor and returns nextCursor", () => {
    const items = [
      item({
        id: "a",
        kind: "care",
        type: "feed",
        at: "2026-09-06T03:00:00.000Z",
      }),
      item({
        id: "b",
        kind: "care",
        type: "feed",
        at: "2026-09-06T02:00:00.000Z",
      }),
      item({
        id: "c",
        kind: "growth",
        type: "weight",
        at: "2026-09-06T01:00:00.000Z",
      }),
    ];
    const first = mergeAndPageBabyTimeline(items, { limit: 2 });
    assert.deepEqual(
      first.items.map((i) => i.id),
      ["a", "b"],
    );
    assert.ok(first.nextCursor);

    const second = mergeAndPageBabyTimeline(items, {
      limit: 2,
      cursor: first.nextCursor,
    });
    assert.deepEqual(
      second.items.map((i) => i.id),
      ["c"],
    );
    assert.equal(second.nextCursor, null);
  });

  it("workspace isolation is caller-scoped (only provided items appear)", () => {
    const wsA = mergeAndPageBabyTimeline(
      [
        item({
          id: "only-a",
          kind: "care",
          type: "feed",
          at: "2026-09-06T10:00:00.000Z",
        }),
      ],
      { limit: 10 },
    );
    assert.equal(wsA.items.length, 1);
    assert.equal(wsA.items[0]?.id, "only-a");
    assert.equal(
      wsA.items.some((i) => i.id === "other-ws"),
      false,
    );
  });
});

describe("union keyset paging (proven bound)", () => {
  function afterCursor(
    rows: BabyTimelineItem[],
    cursor: string | null | undefined,
  ): BabyTimelineItem[] {
    if (!cursor) return rows;
    const decoded = decodeBabyTimelineCursor(cursor);
    assert.ok(decoded);
    return rows.filter((row) => {
      const atMs = Date.parse(row.at);
      return (
        atMs < decoded.atMs ||
        (atMs === decoded.atMs && row.id < decoded.id)
      );
    });
  }

  /** Mimics DB: keyset filter then LIMIT per side, then mergeKeysetSources. */
  function pageFromSources(
    careAll: BabyTimelineItem[],
    growthAll: BabyTimelineItem[],
    limit: number,
    cursor?: string | null,
  ) {
    const careSorted = [...careAll].sort((a, b) => {
      const d = Date.parse(b.at) - Date.parse(a.at);
      return d !== 0 ? d : b.id.localeCompare(a.id);
    });
    const growthSorted = [...growthAll].sort((a, b) => {
      const d = Date.parse(b.at) - Date.parse(a.at);
      return d !== 0 ? d : b.id.localeCompare(a.id);
    });
    const care = afterCursor(careSorted, cursor).slice(0, limit);
    const growth = afterCursor(growthSorted, cursor).slice(0, limit);
    return mergeKeysetSources(care, growth, limit);
  }

  it("deep pages do not skip rows when each side exceeds limit", () => {
    const care: BabyTimelineItem[] = [];
    const growth: BabyTimelineItem[] = [];
    // 40 care + 40 growth, interleaved by minute — busy day past old limit+20 window
    for (let i = 0; i < 40; i++) {
      const careMs = Date.parse("2026-09-06T20:00:00.000Z") - i * 60_000;
      const growthMs = careMs - 30_000;
      care.push(
        item({
          id: `c${String(i).padStart(2, "0")}`,
          kind: "care",
          type: "feed",
          at: new Date(careMs).toISOString(),
        }),
      );
      growth.push(
        item({
          id: `g${String(i).padStart(2, "0")}`,
          kind: "growth",
          type: "weight",
          at: new Date(growthMs).toISOString(),
        }),
      );
    }

    const limit = 10;
    const seen = new Set<string>();
    let cursor: string | null = null;
    let pages = 0;
    for (;;) {
      const page = pageFromSources(care, growth, limit, cursor);
      pages += 1;
      for (const row of page.items) {
        assert.equal(seen.has(row.id), false, `duplicate ${row.id}`);
        seen.add(row.id);
      }
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
      assert.ok(pages < 20, "pagination should terminate");
    }

    assert.equal(seen.size, 80);
    assert.ok(pages >= 8);
  });

  it("mergeKeysetSources sets nextCursor when a side is full", () => {
    const care = Array.from({ length: 10 }, (_, i) =>
      item({
        id: `c${i}`,
        kind: "care",
        type: "feed",
        at: new Date(1_700_000_000_000 - i * 1000).toISOString(),
      }),
    );
    const page = mergeKeysetSources(care, [], 10);
    assert.equal(page.items.length, 10);
    assert.ok(page.nextCursor);
  });
});

describe("careSummary", () => {
  it("labels feed as Feed (Breast L/R) with compact duration from durationSec", () => {
    assert.equal(
      careSummary("feed", { method: "breast_l", durationSec: 12 * 60 }, "en", null),
      "Feed (Breast L) · 12m",
    );
    assert.equal(
      careSummary("feed", { method: "breast_r", durationSec: 65 * 60 }, "en", null),
      "Feed (Breast R) · 1h 5m",
    );
    assert.equal(
      careSummary("feed", { method: "formula" }, "en", null),
      "Feed (Formula)",
    );
  });

  it("does not invent a duration fragment when durationSec is missing", () => {
    assert.equal(
      careSummary("feed", { method: "pump" }, "en", "2026-09-06T12:00:00.000Z"),
      "Feed (Pump)",
    );
  });

  it("uses started/ended sleep copy; closed sleep appends duration from endedAt", () => {
    assert.equal(careSummary("sleep", {}, "en", null), "Started sleep");
    assert.equal(
      careSummary(
        "sleep",
        {},
        "en",
        "2026-09-06T12:12:00.000Z",
        "2026-09-06T12:00:00.000Z",
      ),
      "Ended sleep · 12m",
    );
    assert.equal(
      careSummary("sleep", { notes: "short nap" }, "en", null),
      "Started sleep — short nap",
    );
  });

  it("open sleep has no duration fragment", () => {
    assert.equal(careSummary("sleep", {}, "en", null), "Started sleep");
  });

  it("localizes VI start/end sleep", () => {
    assert.equal(careSummary("sleep", {}, "vi", null), "Bắt đầu ngủ");
    assert.equal(
      careSummary("sleep", {}, "vi", "2026-09-06T12:00:00.000Z"),
      "Kết thúc ngủ",
    );
  });
});
