import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveHydrationSeries,
  type BabyHydrationCareItem,
} from "@/lib/baby-insights-hydration";

function diaper(
  at: string,
  kind: string,
): BabyHydrationCareItem {
  return {
    type: "diaper",
    at,
    payload: { kind },
  };
}

function feed(
  at: string,
  amountMl?: number,
  durationSec?: number,
): BabyHydrationCareItem {
  const payload: Record<string, unknown> = {};
  if (amountMl != null) payload.amountMl = amountMl;
  if (durationSec != null) payload.durationSec = durationSec;
  return { type: "feed", at, payload };
}

describe("deriveHydrationSeries", () => {
  it("wet+mixed count toward wetCount; dry and dirty-only do not", () => {
    const result = deriveHydrationSeries(
      [
        diaper("2026-09-14T10:00:00", "wet"),
        diaper("2026-09-14T11:00:00", "mixed"),
        diaper("2026-09-14T12:00:00", "dry"),
        diaper("2026-09-14T13:00:00", "dirty"),
        feed("2026-09-14T09:00:00"),
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    assert.equal(result.days.length, 1);
    assert.equal(result.days[0]!.wetCount, 2);
    assert.equal(result.days[0]!.feedCount, 1);
  });

  it("low_wet when mid-range day has wet<6 and ≥1 feed", () => {
    const items: BabyHydrationCareItem[] = [
      // Mon — fine
      ...Array.from({ length: 6 }, (_, i) =>
        diaper(`2026-09-14T${10 + i}:00:00`, "wet"),
      ),
      feed("2026-09-14T09:00:00"),
      // Tue — low wet + feeds → alert
      diaper("2026-09-15T10:00:00", "wet"),
      diaper("2026-09-15T11:00:00", "wet"),
      diaper("2026-09-15T12:00:00", "wet"),
      diaper("2026-09-15T13:00:00", "wet"),
      feed("2026-09-15T09:00:00"),
      feed("2026-09-15T14:00:00"),
      // Wed — fine
      ...Array.from({ length: 6 }, (_, i) =>
        diaper(`2026-09-16T${10 + i}:00:00`, "wet"),
      ),
      feed("2026-09-16T09:00:00"),
    ];
    const result = deriveHydrationSeries(items, {
      fromDate: "2026-09-14",
      toDate: "2026-09-16",
    });
    assert.equal(result.alert, "low_wet");
  });

  it("no low_wet when low-wet day has zero feeds and zero formulaMl", () => {
    const result = deriveHydrationSeries(
      [
        diaper("2026-09-14T10:00:00", "wet"),
        diaper("2026-09-14T11:00:00", "wet"),
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    assert.equal(result.alert, null);
    assert.ok(result.days[0]!.wetCount < 6);
    assert.equal(result.days[0]!.feedCount, 0);
  });

  it("hasMorePages true → alert null", () => {
    const result = deriveHydrationSeries(
      [
        diaper("2026-09-14T10:00:00", "wet"),
        feed("2026-09-14T09:00:00"),
      ],
      {
        fromDate: "2026-09-14",
        toDate: "2026-09-14",
        hasMorePages: true,
      },
    );
    assert.ok(result.days[0]!.wetCount < 6);
    assert.ok(result.days[0]!.feedCount >= 1);
    assert.equal(result.alert, null);
  });

  it("breast durationSec alone does not create formulaMl", () => {
    const result = deriveHydrationSeries(
      [
        feed("2026-09-14T09:00:00", undefined, 600),
        diaper("2026-09-14T10:00:00", "wet"),
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    const day = result.days[0]!;
    assert.equal(day.feedCount, 1);
    assert.equal(day.formulaMl ?? 0, 0);
  });

  it("soft empty when no wet and no useful feed/formula signal", () => {
    const result = deriveHydrationSeries(
      [diaper("2026-09-14T10:00:00", "dry")],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    assert.equal(result.emptyReason, "need_more_logs");
    assert.equal(result.alert, null);
  });

  it("sums formulaMl when amountMl present", () => {
    const result = deriveHydrationSeries(
      [
        feed("2026-09-14T09:00:00", 120),
        feed("2026-09-14T12:00:00", 80),
        diaper("2026-09-14T10:00:00", "wet"),
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    assert.equal(result.days[0]!.formulaMl, 200);
    assert.equal(result.emptyReason, undefined);
  });
});
