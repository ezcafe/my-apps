import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_LAST_CARE_MAX_PAGES,
  BABY_LAST_CARE_PAGE_LIMIT,
} from "@/lib/baby-last-care-status";
import {
  BABY_GROWTH_ENTRIES_QUERY,
  BABY_GROWTH_MAX_PAGES,
  BABY_INSIGHTS_TIMELINE_PAGE_LIMIT,
  BABY_TIMELINE_MAX_PAGES,
  babyGrowthNextPageParam,
  babyGrowthQueryOptions,
  babyInsightsShouldAutoFetchNextPage,
  babyKeys,
  babyLastCareStatusQueryOptions,
  babyLastCareStatusWalkDefault,
  babyTimelineNextPageParam,
  babyTimelineQueryOptions,
  applyBabyTimelineSyncTruncate,
  babyTimelineSyncShouldFetch,
  buildBabyInsightsQueryFns,
  fetchBabyLastCareStatus,
  invalidateBabyQueries,
  replaceBabyTimelineFirstPage,
  windowBabyGrowthInfiniteData,
  type BabyGrowthPage,
  type BabyTimelineInfiniteData,
  type BabyTimelinePage,
  type BabyVaccinePage,
  type FetchBabyTimelinePageFn,
  babyVaccinesNextPageParam,
} from "@/lib/baby-query-options";

describe("babyKeys.growth", () => {
  it("includes from/to so ranged caches do not collide", () => {
    assert.deepEqual(babyKeys.growth("weight", "a", "b"), [
      "baby",
      "growth",
      "weight",
      "a",
      "b",
    ]);
    assert.deepEqual(babyKeys.growth(), ["baby", "growth", "all", "", ""]);
  });
});

describe("babyKeys.timeline", () => {
  it("includes from/to so ranged caches do not collide", () => {
    assert.deepEqual(babyKeys.timeline("a", "b"), [
      "baby",
      "timeline",
      "a",
      "b",
    ]);
    assert.deepEqual(babyKeys.timeline(), ["baby", "timeline", "", ""]);
  });
});

describe("babyKeys.vaccines", () => {
  it("includes from/to/cursor so caches stay safe", () => {
    assert.deepEqual(babyKeys.vaccines("a", "b", "c"), [
      "baby",
      "vaccines",
      "a",
      "b",
      "c",
    ]);
    assert.deepEqual(babyKeys.vaccines(), [
      "baby",
      "vaccines",
      "",
      "",
      "",
    ]);
  });
});

describe("babyTimelineQueryOptions", () => {
  it("puts non-empty from/to on queryKey for Insights caches", () => {
    const from = "2026-09-01T00:00:00.000Z";
    const to = "2026-09-30T23:59:59.999Z";
    const opts = babyTimelineQueryOptions(from, to);
    assert.deepEqual(opts.queryKey, babyKeys.timeline(from, to));
  });
});

describe("babyGrowthEntries from/to wiring", () => {
  it("query document passes $from/$to into babyGrowthEntries", () => {
    assert.match(BABY_GROWTH_ENTRIES_QUERY, /\$from:\s*String/);
    assert.match(BABY_GROWTH_ENTRIES_QUERY, /\$to:\s*String/);
    assert.match(BABY_GROWTH_ENTRIES_QUERY, /from:\s*\$from/);
    assert.match(BABY_GROWTH_ENTRIES_QUERY, /to:\s*\$to/);
  });

  it("babyGrowthQueryOptions includes from/to in queryKey", () => {
    const from = "2026-09-01T00:00:00.000Z";
    const to = "2026-09-30T23:59:59.999Z";
    const opts = babyGrowthQueryOptions("weight", from, to);
    assert.deepEqual(opts.queryKey, babyKeys.growth("weight", from, to));
  });
});

describe("buildBabyInsightsQueryFns", () => {
  const from = "2026-09-01T00:00:00.000Z";
  const to = "2026-09-30T23:59:59.999Z";

  it("timeline/growth/sync fetches pass applied Insights from/to bounds", async () => {
    const timelineCalls: Array<{
      from?: string;
      to?: string;
      cursor?: string | null;
      limit?: number;
    }> = [];
    const growthCalls: Array<{
      from?: string;
      to?: string;
      cursor?: string | null;
      limit?: number;
    }> = [];

    const emptyTimeline = {
      babyTimeline: { items: [], nextCursor: null },
    };
    const emptyGrowth = {
      babyGrowthEntries: { items: [], nextCursor: null },
    };

    const fns = buildBabyInsightsQueryFns(
      { from, to },
      {
        fetchTimeline: async (input) => {
          timelineCalls.push(input);
          return emptyTimeline;
        },
        fetchGrowth: async (input) => {
          growthCalls.push(input);
          return emptyGrowth;
        },
      },
    );

    assert.deepEqual(fns.timelineQueryKey, babyKeys.timeline(from, to));
    assert.deepEqual(fns.growthQueryKey, babyKeys.growth(undefined, from, to));

    await fns.timelineQueryFn({ pageParam: "cursor-1" });
    await fns.growthQueryFn({ pageParam: "cursor-2" });
    await fns.syncTimelineFirstPage();

    assert.equal(timelineCalls.length, 2);
    assert.equal(growthCalls.length, 1);

    assert.equal(timelineCalls[0]?.from, from);
    assert.equal(timelineCalls[0]?.to, to);
    assert.equal(timelineCalls[0]?.cursor, "cursor-1");
    assert.equal(timelineCalls[0]?.limit, BABY_INSIGHTS_TIMELINE_PAGE_LIMIT);

    assert.equal(growthCalls[0]?.from, from);
    assert.equal(growthCalls[0]?.to, to);
    assert.equal(growthCalls[0]?.cursor, "cursor-2");
    assert.equal(growthCalls[0]?.limit, 50);

    assert.equal(timelineCalls[1]?.from, from);
    assert.equal(timelineCalls[1]?.to, to);
    assert.equal(timelineCalls[1]?.limit, BABY_INSIGHTS_TIMELINE_PAGE_LIMIT);
    assert.equal(
      "cursor" in timelineCalls[1]! && timelineCalls[1]!.cursor !== undefined,
      false,
    );
  });
});

describe("invalidateBabyQueries", () => {
  it("blanket all uses babyKeys.all", async () => {
    const keys: unknown[][] = [];
    await invalidateBabyQueries({
      invalidateQueries: async (opts) => {
        keys.push([...opts.queryKey]);
      },
    });
    assert.deepEqual(keys, [babyKeys.all]);
  });

  it("care scope invalidates timeline (+ profile), not growth/sync", async () => {
    const keys: unknown[][] = [];
    await invalidateBabyQueries(
      {
        invalidateQueries: async (opts) => {
          keys.push([...opts.queryKey]);
        },
      },
      "care",
    );
    assert.deepEqual(keys, [
      [...babyKeys.all, "timeline"],
      babyKeys.profile(),
    ]);
  });

  it("growth scope invalidates growth + timeline", async () => {
    const keys: unknown[][] = [];
    await invalidateBabyQueries(
      {
        invalidateQueries: async (opts) => {
          keys.push([...opts.queryKey]);
        },
      },
      "growth",
    );
    assert.deepEqual(keys, [
      [...babyKeys.all, "growth"],
      [...babyKeys.all, "timeline"],
    ]);
  });

  it("vaccines scope invalidates vaccines only", async () => {
    const keys: unknown[][] = [];
    await invalidateBabyQueries(
      {
        invalidateQueries: async (opts) => {
          keys.push([...opts.queryKey]);
        },
      },
      "vaccines",
    );
    assert.deepEqual(keys, [[...babyKeys.all, "vaccines"]]);
  });
});

describe("replaceBabyTimelineFirstPage", () => {
  const page = (
    id: string,
    nextCursor: string | null = null,
  ): BabyTimelinePage => ({
    babyTimeline: {
      items: [
        {
          id,
          kind: "care",
          type: "feed",
          at: "2026-09-06T12:00:00.000Z",
          endedAt: null,
          summary: "Feed",
          source: "web",
          cursor: "c",
        },
      ],
      nextCursor,
    },
  });

  it("replaces sole first page when no deeper pages exist", () => {
    const next = replaceBabyTimelineFirstPage(
      { pages: [page("old")], pageParams: [null] },
      page("fresh", "c1"),
    );
    assert.equal(next.pages.length, 1);
    assert.equal(next.pages[0]?.babyTimeline.items[0]?.id, "fresh");
    assert.deepEqual(next.pageParams, [null]);
  });

  it("always truncates to first page even when cursor chain matches (stale pages 2+)", () => {
    const next = replaceBabyTimelineFirstPage(
      {
        pages: [page("old", "cursor-1"), page("stale-deep"), page("stale-deeper")],
        pageParams: [null, "cursor-1", "cursor-2"],
      },
      page("fresh", "cursor-1"),
    );
    assert.equal(next.pages.length, 1);
    assert.equal(next.pages[0]?.babyTimeline.items[0]?.id, "fresh");
    assert.equal(next.pages[0]?.babyTimeline.nextCursor, "cursor-1");
    assert.deepEqual(next.pageParams, [null]);
  });

  it("truncates to first page when fresh nextCursor breaks the chain", () => {
    const next = replaceBabyTimelineFirstPage(
      {
        pages: [page("old", "cursor-1"), page("deep"), page("deeper")],
        pageParams: [null, "cursor-1", "cursor-2"],
      },
      page("fresh", "cursor-shifted"),
    );
    assert.equal(next.pages.length, 1);
    assert.equal(next.pages[0]?.babyTimeline.items[0]?.id, "fresh");
    assert.equal(next.pages[0]?.babyTimeline.nextCursor, "cursor-shifted");
    assert.deepEqual(next.pageParams, [null]);
  });

  it("truncates to first page when fresh nextCursor is null but deeper pages remain", () => {
    const next = replaceBabyTimelineFirstPage(
      {
        pages: [page("old", "cursor-1"), page("deep")],
        pageParams: [null, "cursor-1"],
      },
      page("fresh", null),
    );
    assert.equal(next.pages.length, 1);
    assert.equal(next.pages[0]?.babyTimeline.items[0]?.id, "fresh");
    assert.deepEqual(next.pageParams, [null]);
  });

  it("seeds first page only when cache is empty", () => {
    const next = replaceBabyTimelineFirstPage(undefined, page("fresh"));
    assert.equal(next.pages.length, 1);
    assert.equal(next.pages[0]?.babyTimeline.items[0]?.id, "fresh");
    assert.deepEqual(next.pageParams, [null]);
  });
});

describe("applyBabyTimelineSyncTruncate", () => {
  const page = (
    id: string,
    nextCursor: string | null = null,
  ): BabyTimelinePage => ({
    babyTimeline: {
      items: [
        {
          id,
          kind: "care",
          type: "feed",
          at: "2026-09-06T12:00:00.000Z",
          endedAt: null,
          summary: "Feed",
          source: "web",
          cursor: "c",
        },
      ],
      nextCursor,
    },
  });

  it("awaits cancelQueries before setQueryData so in-flight fetchNextPage cannot overwrite truncate", async () => {
    const key = babyKeys.timeline("2026-09-01", "2026-09-30");
    const order: string[] = [];
    let stored: BabyTimelineInfiniteData | undefined = {
      pages: [page("old", "c1"), page("deep")],
      pageParams: [null, "c1"],
    };

    const client = {
      cancelQueries: async (opts: { queryKey: readonly unknown[] }) => {
        order.push("cancel");
        assert.deepEqual(opts.queryKey, key);
        return undefined;
      },
      setQueryData: (
        qk: readonly unknown[],
        updater: (
          old: BabyTimelineInfiniteData | undefined,
        ) => BabyTimelineInfiniteData,
      ) => {
        order.push("set");
        assert.deepEqual(qk, key);
        stored = updater(stored);
        return stored;
      },
    };

    await applyBabyTimelineSyncTruncate(client, key, page("fresh", "c1"));

    assert.deepEqual(order, ["cancel", "set"]);
    assert.equal(stored?.pages.length, 1);
    assert.equal(stored?.pages[0]?.babyTimeline.items[0]?.id, "fresh");
    assert.deepEqual(stored?.pageParams, [null]);
  });
});

describe("baby growth page window", () => {
  const growthPage = (
    id: string,
    nextCursor: string | null,
  ): BabyGrowthPage => ({
    babyGrowthEntries: {
      items: [
        {
          id,
          kind: "weight",
          recordedAt: "2026-09-06T12:00:00.000Z",
          valueNum: 1,
          valueText: null,
          unit: "kg",
          notes: null,
        },
      ],
      nextCursor,
    },
  });

  it("keeps Load more available when nextCursor remains past auto-page max", () => {
    assert.ok(BABY_GROWTH_MAX_PAGES >= 2);
    const pages = Array.from({ length: BABY_GROWTH_MAX_PAGES }, (_, i) =>
      growthPage(`p${i}`, i < BABY_GROWTH_MAX_PAGES - 1 ? `c${i}` : "c-more"),
    );
    assert.equal(
      babyGrowthNextPageParam(pages[pages.length - 1]!, pages),
      "c-more",
    );
    assert.equal(
      babyGrowthNextPageParam(growthPage("a", "c1"), [growthPage("a", "c1")]),
      "c1",
    );
  });

  it("stops Load more at soft max pages (partialCapped path)", async () => {
    const { BABY_GROWTH_SOFT_MAX_PAGES } = await import(
      "@/lib/baby-query-options"
    );
    const pages = Array.from({ length: BABY_GROWTH_SOFT_MAX_PAGES }, (_, i) =>
      growthPage(`p${i}`, "still-more"),
    );
    assert.equal(
      babyGrowthNextPageParam(pages[pages.length - 1]!, pages),
      undefined,
    );
  });

  it("windowBabyGrowthInfiniteData keeps only the first max pages", () => {
    const pages = Array.from({ length: BABY_GROWTH_MAX_PAGES + 2 }, (_, i) =>
      growthPage(`p${i}`, `c${i}`),
    );
    const pageParams = pages.map((_, i) => (i === 0 ? null : `c${i - 1}`));
    const next = windowBabyGrowthInfiniteData({ pages, pageParams });
    assert.equal(next.pages.length, BABY_GROWTH_MAX_PAGES);
    assert.equal(next.pageParams.length, BABY_GROWTH_MAX_PAGES);
    assert.equal(next.pages[0]?.babyGrowthEntries.items[0]?.id, "p0");
    assert.equal(
      next.pages[BABY_GROWTH_MAX_PAGES - 1]?.babyGrowthEntries.items[0]?.id,
      `p${BABY_GROWTH_MAX_PAGES - 1}`,
    );
  });
});

describe("babyTimelineNextPageParam", () => {
  function timelinePage(
    id: string,
    nextCursor: string | null,
  ): BabyTimelinePage {
    return {
      babyTimeline: {
        items: [
          {
            id,
            kind: "care",
            type: "feed",
            at: "2026-09-06T12:00:00.000Z",
            endedAt: null,
            summary: id,
            source: "app",
            cursor: id,
          },
        ],
        nextCursor,
      },
    };
  }

  it("keeps Load more available when nextCursor remains past auto-page max", () => {
    assert.ok(BABY_TIMELINE_MAX_PAGES >= 2);
    const pages = Array.from({ length: BABY_TIMELINE_MAX_PAGES }, (_, i) =>
      timelinePage(`p${i}`, i < BABY_TIMELINE_MAX_PAGES - 1 ? `c${i}` : "c-more"),
    );
    assert.equal(
      babyTimelineNextPageParam(pages[pages.length - 1]!, pages),
      "c-more",
    );
    assert.equal(
      babyTimelineNextPageParam(timelinePage("a", "c1"), [
        timelinePage("a", "c1"),
      ]),
      "c1",
    );
  });

  it("stops Load more at soft max pages (partialCapped path)", async () => {
    const { BABY_TIMELINE_SOFT_MAX_PAGES } = await import(
      "@/lib/baby-query-options"
    );
    const pages = Array.from({ length: BABY_TIMELINE_SOFT_MAX_PAGES }, (_, i) =>
      timelinePage(`p${i}`, "still-more"),
    );
    assert.equal(
      babyTimelineNextPageParam(pages[pages.length - 1]!, pages),
      undefined,
    );
  });

  it("returns undefined when last page has no next cursor", () => {
    assert.equal(
      babyTimelineNextPageParam(timelinePage("a", null), [
        timelinePage("a", null),
      ]),
      undefined,
    );
  });
});

describe("babyInsightsShouldAutoFetchNextPage", () => {
  it("auto-fetches only while under the page cap", () => {
    assert.equal(babyInsightsShouldAutoFetchNextPage(0, 4), true);
    assert.equal(babyInsightsShouldAutoFetchNextPage(3, 4), true);
    assert.equal(babyInsightsShouldAutoFetchNextPage(4, 4), false);
    assert.equal(babyInsightsShouldAutoFetchNextPage(5, 4), false);
  });

  it("skips auto-fetch after sync truncate (manual Load more only)", () => {
    assert.equal(
      babyInsightsShouldAutoFetchNextPage(1, 4, { allowAutoFetch: false }),
      false,
    );
    assert.equal(
      babyInsightsShouldAutoFetchNextPage(1, 4, { allowAutoFetch: true }),
      true,
    );
  });
});

describe("BABY_INSIGHTS_TIMELINE_PAGE_LIMIT", () => {
  it("stays within babyTimelineInputSchema limit max (100)", async () => {
    const { babyTimelineInputSchema } = await import("@/lib/validators/baby");
    assert.ok(BABY_INSIGHTS_TIMELINE_PAGE_LIMIT <= 100);
    assert.equal(
      babyTimelineInputSchema.safeParse({
        limit: BABY_INSIGHTS_TIMELINE_PAGE_LIMIT,
      }).success,
      true,
    );
  });
});

describe("babyTimelineSyncShouldFetch", () => {
  it("skips while a sync fetch is already in flight", () => {
    assert.equal(babyTimelineSyncShouldFetch(false), true);
    assert.equal(babyTimelineSyncShouldFetch(true), false);
  });
});

describe("babyLastCareStatusQueryOptions", () => {
  it("shares empty-bounds timeline key and queryFn invokes capped walk", async () => {
    const walkResult = {
      feed: {
        type: "feed",
        at: "2026-09-06T12:00:00.000Z",
        endedAt: null,
        summary: "walked",
      },
      sleep: null,
      diaper: null,
    };
    let walkCalls = 0;
    const opts = babyLastCareStatusQueryOptions(async () => {
      walkCalls += 1;
      return walkResult;
    });
    assert.deepEqual(opts.queryKey, babyKeys.timeline("", ""));
    assert.equal(typeof opts.queryFn, "function");
    const data = await opts.queryFn!({
      client: {} as never,
      queryKey: opts.queryKey,
      signal: AbortSignal.timeout(5_000),
      meta: undefined,
    });
    assert.equal(walkCalls, 1);
    assert.equal(data, walkResult);
  });

  it("defaults the walk to fetchBabyLastCareStatus", () => {
    assert.equal(babyLastCareStatusWalkDefault, fetchBabyLastCareStatus);
  });
});

describe("fetchBabyLastCareStatus", () => {
  function row(
    id: string,
    type: string,
    at: string,
    endedAt: string | null = null,
  ): BabyTimelinePage["babyTimeline"]["items"][number] {
    return {
      id,
      kind: "care",
      type,
      at,
      endedAt,
      summary: `${type}-${id}`,
      source: "web",
      cursor: id,
    };
  }

  function page(
    items: BabyTimelinePage["babyTimeline"]["items"],
    nextCursor: string | null,
  ): BabyTimelinePage {
    return { babyTimeline: { items, nextCursor } };
  }

  it("accumulates care types across pages", async () => {
    const calls: Array<Parameters<FetchBabyTimelinePageFn>[0]> = [];
    const fetchPage: FetchBabyTimelinePageFn = async (input) => {
      calls.push(input);
      if (calls.length === 1) {
        return page([row("1", "feed", "2026-09-06T12:00:00.000Z")], "c2");
      }
      return page(
        [
          row("2", "sleep", "2026-09-06T11:00:00.000Z", "2026-09-06T11:30:00.000Z"),
          row("3", "diaper", "2026-09-06T10:00:00.000Z"),
        ],
        null,
      );
    };

    const status = await fetchBabyLastCareStatus(BABY_LAST_CARE_MAX_PAGES, fetchPage);
    assert.equal(status.feed?.summary, "feed-1");
    assert.equal(status.sleep?.summary, "sleep-2");
    assert.equal(status.diaper?.summary, "diaper-3");
    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.cursor, null);
    assert.equal(calls[1]?.cursor, "c2");
  });

  it("stops early once all three types are found", async () => {
    let calls = 0;
    const fetchPage: FetchBabyTimelinePageFn = async () => {
      calls += 1;
      return page(
        [
          row("1", "feed", "2026-09-06T12:00:00.000Z"),
          row("2", "sleep", "2026-09-06T11:00:00.000Z"),
          row("3", "diaper", "2026-09-06T10:00:00.000Z"),
        ],
        "still-more",
      );
    };

    const status = await fetchBabyLastCareStatus(BABY_LAST_CARE_MAX_PAGES, fetchPage);
    assert.ok(status.feed && status.sleep && status.diaper);
    assert.equal(calls, 1);
  });

  it("stops at BABY_LAST_CARE_MAX_PAGES even with remaining cursor", async () => {
    const calls: Array<Parameters<FetchBabyTimelinePageFn>[0]> = [];
    const fetchPage: FetchBabyTimelinePageFn = async (input) => {
      calls.push(input);
      return page(
        [row(`f${calls.length}`, "feed", `2026-09-0${calls.length}T12:00:00.000Z`)],
        `c${calls.length + 1}`,
      );
    };

    const status = await fetchBabyLastCareStatus(BABY_LAST_CARE_MAX_PAGES, fetchPage);
    assert.equal(calls.length, BABY_LAST_CARE_MAX_PAGES);
    assert.equal(status.feed?.id, "f1");
    assert.equal(status.sleep, null);
    assert.equal(status.diaper, null);
    assert.equal(calls[0]?.cursor, null);
    assert.equal(calls[1]?.cursor, "c2");
    assert.equal(calls[2]?.cursor, "c3");
  });

  it("passes nextCursor and omits from/to on each page request", async () => {
    const calls: Array<Parameters<FetchBabyTimelinePageFn>[0]> = [];
    const fetchPage: FetchBabyTimelinePageFn = async (input) => {
      calls.push(input);
      if (calls.length === 1) {
        return page([row("1", "feed", "2026-09-06T12:00:00.000Z")], "next-1");
      }
      return page(
        [
          row("2", "sleep", "2026-09-06T11:00:00.000Z"),
          row("3", "diaper", "2026-09-06T10:00:00.000Z"),
        ],
        "next-2",
      );
    };

    await fetchBabyLastCareStatus(BABY_LAST_CARE_MAX_PAGES, fetchPage);
    assert.equal(calls.length, 2);
    for (const call of calls) {
      assert.equal("from" in call && call.from !== undefined, false);
      assert.equal("to" in call && call.to !== undefined, false);
      assert.equal(call.limit, BABY_LAST_CARE_PAGE_LIMIT);
    }
    assert.equal(calls[0]?.cursor, null);
    assert.equal(calls[1]?.cursor, "next-1");
  });
});

describe("babyVaccinesNextPageParam", () => {
  function vaccinePage(nextCursor: string | null): BabyVaccinePage {
    return {
      babyVaccines: {
        items: [
          {
            id: "v1",
            name: "HepB",
            dose: "first",
            administeredAt: "2026-09-06T12:00:00.000Z",
            notes: null,
            source: "web",
          },
        ],
        nextCursor,
      },
    };
  }

  it("follows nextCursor for Load more", () => {
    assert.equal(
      babyVaccinesNextPageParam(vaccinePage("c2"), [vaccinePage("c2")]),
      "c2",
    );
    assert.equal(
      babyVaccinesNextPageParam(vaccinePage(null), [vaccinePage(null)]),
      undefined,
    );
  });

  it("stops Load more at soft max pages (partialCapped path)", async () => {
    const { BABY_VACCINES_SOFT_MAX_PAGES } = await import(
      "@/lib/baby-query-options"
    );
    const pages = Array.from(
      { length: BABY_VACCINES_SOFT_MAX_PAGES },
      () => vaccinePage("still-more"),
    );
    assert.equal(
      babyVaccinesNextPageParam(pages[pages.length - 1]!, pages),
      undefined,
    );
  });
});
