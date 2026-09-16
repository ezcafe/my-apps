import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertBabyInsightsSeriesRangeSpan,
  BABY_INSIGHTS_SERIES_MAX_DAYS,
  babyInsightsSeriesCareLoadFrom,
  buildBabyInsightsSeriesFromItems,
} from "@/features/baby/server/insights-series";
import {
  BABY_INSIGHTS_SERIES_QUERY,
  BABY_INSIGHTS_TIMELINE_QUERY,
} from "@/lib/baby-query-options";

// Shared Home TIMELINE_Q must stay payload-free — assert via source string.
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("babyInsightsSeriesCareLoadFrom", () => {
  it("pulls loadFrom back to night window start for today-only range", () => {
    // Applied range starts at local midnight of D; night window for D starts D−1 19:00.
    const rangeFrom = new Date(2026, 8, 15, 0, 0, 0, 0);
    const loadFrom = babyInsightsSeriesCareLoadFrom(rangeFrom, "2026-09-15");
    assert.equal(loadFrom.getTime(), new Date(2026, 8, 14, 19, 0, 0, 0).getTime());
  });

  it("does not move loadFrom later than range from", () => {
    const rangeFrom = new Date(2026, 8, 14, 18, 0, 0, 0);
    const loadFrom = babyInsightsSeriesCareLoadFrom(rangeFrom, "2026-09-15");
    assert.equal(loadFrom.getTime(), rangeFrom.getTime());
  });
});

describe("buildBabyInsightsSeriesFromItems", () => {
  it("thin data → soft empty reasons", () => {
    const dto = buildBabyInsightsSeriesFromItems(
      [],
      "2026-09-14",
      "2026-09-14",
    );
    assert.equal(dto.hydration.emptyReason, "need_more_logs");
    assert.equal(dto.nightRest.emptyReason, "need_more_sleep_logs");
    assert.equal(dto.sleepEfficiency.emptyReason, "need_night_waking_logs");
  });

  it("happy path hydration DTO shape", () => {
    const dto = buildBabyInsightsSeriesFromItems(
      [
        {
          type: "diaper",
          at: "2026-09-14T10:00:00",
          endedAt: null,
          payload: { kind: "wet" },
        },
        {
          type: "feed",
          at: "2026-09-14T09:00:00",
          endedAt: null,
          payload: { amountMl: 100 },
        },
      ],
      "2026-09-14",
      "2026-09-14",
    );
    assert.ok(dto.hydration.days.length >= 1);
    assert.equal(dto.hydration.alert, "low_wet");
    assert.deepEqual(dto.counts, { feeds: 1, sleep: 0, diapers: 1 });
    assert.equal(dto.careCountDays.length, 1);
    assert.equal(dto.careCountDays[0]?.feed, 1);
    assert.equal(dto.careCountDays[0]?.diaper, 1);
  });

  it("counts exclude lookback rows outside applied fromDate", () => {
    const dto = buildBabyInsightsSeriesFromItems(
      [
        {
          type: "sleep",
          at: "2026-09-14T19:30:00",
          endedAt: "2026-09-14T21:00:00",
          payload: {},
        },
        {
          type: "feed",
          at: "2026-09-15T08:00:00",
          endedAt: null,
          payload: {},
        },
      ],
      "2026-09-15",
      "2026-09-15",
    );
    assert.deepEqual(dto.counts, { feeds: 1, sleep: 0, diapers: 0 });
  });

  it("Night Rest multi-block: evening segments before range from must be included", () => {
    // Simulates loader that only kept one prior sleep (22:00) + in-range (02:00),
    // dropping the earlier evening block (19:30) — undercount / wrong intervalCount.
    const onePriorOnly = buildBabyInsightsSeriesFromItems(
      [
        {
          type: "sleep",
          at: "2026-09-14T22:00:00",
          endedAt: "2026-09-15T00:30:00",
          payload: {},
        },
        {
          type: "sleep",
          at: "2026-09-15T02:00:00",
          endedAt: "2026-09-15T06:00:00",
          payload: {},
        },
      ],
      "2026-09-15",
      "2026-09-15",
    );
    assert.equal(onePriorOnly.nightRest.days[0]?.intervalCount, 2);

    const withNightLookback = buildBabyInsightsSeriesFromItems(
      [
        {
          type: "sleep",
          at: "2026-09-14T19:30:00",
          endedAt: "2026-09-14T21:00:00",
          payload: {},
        },
        {
          type: "sleep",
          at: "2026-09-14T22:00:00",
          endedAt: "2026-09-15T00:30:00",
          payload: {},
        },
        {
          type: "sleep",
          at: "2026-09-15T02:00:00",
          endedAt: "2026-09-15T06:00:00",
          payload: {},
        },
      ],
      "2026-09-15",
      "2026-09-15",
    );
    assert.equal(withNightLookback.nightRest.days[0]?.intervalCount, 3);
    assert.ok(
      (withNightLookback.nightRest.days[0]?.nightSleepMinutes ?? 0) >
        (onePriorOnly.nightRest.days[0]?.nightSleepMinutes ?? 0),
    );

    // Loader contract: care scan must start at night-window open so the 19:30
    // block is not dropped when range from is local midnight of D.
    const loadFrom = babyInsightsSeriesCareLoadFrom(
      new Date(2026, 8, 15, 0, 0, 0, 0),
      "2026-09-15",
    );
    assert.ok(loadFrom.getTime() <= new Date(2026, 8, 14, 19, 30, 0, 0).getTime());
  });
});

describe("assertBabyInsightsSeriesRangeSpan", () => {
  it("rejects absurd span", () => {
    const from = Date.parse("2026-01-01T00:00:00.000Z");
    const to = from + (BABY_INSIGHTS_SERIES_MAX_DAYS + 5) * 86_400_000;
    assert.throws(
      () => assertBabyInsightsSeriesRangeSpan(from, to),
      /exceeds/,
    );
  });
});

describe("Insights GraphQL documents", () => {
  it("series document present; Insights timeline includes payload; Home TIMELINE_Q omits it", () => {
    assert.match(BABY_INSIGHTS_SERIES_QUERY, /babyInsightsSeries/);
    assert.match(BABY_INSIGHTS_SERIES_QUERY, /\bcounts\b/);
    assert.match(BABY_INSIGHTS_SERIES_QUERY, /careCountDays/);
    assert.match(BABY_INSIGHTS_TIMELINE_QUERY, /\bpayload\b/);

    const src = readFileSync(
      join(process.cwd(), "lib/baby-query-options.ts"),
      "utf8",
    );
    const homeMatch = /query BabyTimeline\([\s\S]*?\n`;/.exec(src);
    assert.ok(homeMatch);
    assert.doesNotMatch(homeMatch[0]!, /\bpayload\b/);
  });
});
