import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyDrillDayKey,
  babyDrilldownForHydrationDay,
  babyTimelineBoundsForDrillDay,
  filterTimelineRowsForDrill,
} from "@/lib/baby-chart-drilldown";
import { babyInsightsDateBoundsIso } from "@/lib/baby-insights-default-range";

describe("baby chart drilldown", () => {
  it("maps wet/feeds series to care types", () => {
    assert.deepEqual(
      babyDrilldownForHydrationDay({ day: "2026-09-15", series: "wet" })
        .careTypes,
      ["diaper"],
    );
    assert.deepEqual(
      babyDrilldownForHydrationDay({ day: "2026-09-15", series: "feeds" })
        .careTypes,
      ["feed"],
    );
  });

  it("normalizes day keys and builds ISO timeline bounds", () => {
    assert.equal(babyDrillDayKey("2026-09-15T12:00:00.000Z"), "2026-09-15");
    const bounds = babyTimelineBoundsForDrillDay("2026-09-15");
    assert.deepEqual(
      bounds,
      babyInsightsDateBoundsIso("2026-09-15", "2026-09-15"),
    );
    assert.match(bounds.from, /T/);
    assert.match(bounds.to, /T/);
  });

  it("filters timeline rows by day + care type", () => {
    const rows = [
      {
        id: "1",
        kind: "care",
        type: "diaper",
        at: "2026-09-15T10:00:00.000Z",
      },
      {
        id: "2",
        kind: "care",
        type: "feed",
        at: "2026-09-15T11:00:00.000Z",
      },
      {
        id: "3",
        kind: "care",
        type: "diaper",
        at: "2026-09-16T10:00:00.000Z",
      },
    ];
    const drill = babyDrilldownForHydrationDay({
      day: "2026-09-15",
      series: "wet",
    });
    const filtered = filterTimelineRowsForDrill(rows, drill);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, "1");
  });
});
