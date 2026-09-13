import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS,
  BABY_FEED_GUIDE_FALLBACK,
  babyAgeInDays,
  babyFeedGuideForAge,
  babyFormulaDefaultMl,
  babyFormulaSnapList,
  babySleepGuideForAge,
  babySuggestedBottleMl,
  buildBabyBottleChipMls,
} from "@/lib/baby-age-guide";

describe("babyAgeInDays", () => {
  it("counts whole local calendar days from birthday", () => {
    const birthNight = new Date(2026, 6, 4, 23, 59);
    assert.equal(babyAgeInDays("2026-07-04", birthNight), 0);

    const nextMorning = new Date(2026, 6, 5, 0, 1);
    assert.equal(babyAgeInDays("2026-07-04", nextMorning), 1);
  });

  it("advances by 1 across DST spring-forward and fall-back nights", () => {
    const beforeSpring = new Date(2024, 2, 9, 12, 0);
    const afterSpring = new Date(2024, 2, 10, 12, 0);
    assert.equal(
      babyAgeInDays("2024-03-09", afterSpring)! -
        babyAgeInDays("2024-03-09", beforeSpring)!,
      1,
    );

    const beforeFall = new Date(2024, 10, 2, 12, 0);
    const afterFall = new Date(2024, 10, 3, 12, 0);
    assert.equal(
      babyAgeInDays("2024-11-02", afterFall)! -
        babyAgeInDays("2024-11-02", beforeFall)!,
      1,
    );
  });

  it("returns null for future birthday and impossible date", () => {
    const now = new Date(2026, 6, 4, 12, 0);
    assert.equal(babyAgeInDays("2026-07-05", now), null);
    assert.equal(babyAgeInDays("2026-02-30", now), null);
  });
});

describe("babyFeedGuideForAge", () => {
  it("maps design day cuts and feedsMin/feedsMax per band", () => {
    const cases: Array<{
      day: number;
      mlMin: number;
      mlMax: number;
      feedsMin: number;
      feedsMax: number;
    }> = [
      { day: 0, mlMin: 5, mlMax: 15, feedsMin: 8, feedsMax: 12 },
      { day: 2, mlMin: 5, mlMax: 15, feedsMin: 8, feedsMax: 12 },
      { day: 3, mlMin: 30, mlMax: 60, feedsMin: 8, feedsMax: 12 },
      { day: 7, mlMin: 30, mlMax: 60, feedsMin: 8, feedsMax: 12 },
      { day: 8, mlMin: 60, mlMax: 90, feedsMin: 6, feedsMax: 8 },
      { day: 28, mlMin: 60, mlMax: 90, feedsMin: 6, feedsMax: 8 },
      { day: 29, mlMin: 90, mlMax: 150, feedsMin: 6, feedsMax: 8 },
      { day: 91, mlMin: 90, mlMax: 150, feedsMin: 6, feedsMax: 8 },
      { day: 92, mlMin: 120, mlMax: 180, feedsMin: 5, feedsMax: 6 },
      { day: 183, mlMin: 120, mlMax: 180, feedsMin: 5, feedsMax: 6 },
      { day: 184, mlMin: 180, mlMax: 240, feedsMin: 3, feedsMax: 4 },
      { day: 365, mlMin: 180, mlMax: 240, feedsMin: 3, feedsMax: 4 },
      { day: 366, mlMin: 120, mlMax: 180, feedsMin: 2, feedsMax: 3 },
      { day: 900, mlMin: 120, mlMax: 180, feedsMin: 1, feedsMax: 2 },
    ];
    for (const c of cases) {
      const band = babyFeedGuideForAge(c.day);
      assert.equal(band.mlMin, c.mlMin, `day ${c.day} mlMin`);
      assert.equal(band.mlMax, c.mlMax, `day ${c.day} mlMax`);
      assert.equal(band.feedsMin, c.feedsMin, `day ${c.day} feedsMin`);
      assert.equal(band.feedsMax, c.feedsMax, `day ${c.day} feedsMax`);
    }
  });

  it("uses fallback for null age", () => {
    assert.deepEqual(babyFeedGuideForAge(null), BABY_FEED_GUIDE_FALLBACK);
  });
});

describe("babyFormulaSnapList and default", () => {
  it("returns every multiple of 10 from mlMin to mlMax inclusive", () => {
    const band = babyFeedGuideForAge(3);
    assert.deepEqual(babyFormulaSnapList(band), [30, 40, 50, 60]);
  });

  it("returns mid-band rounded to 10 and clamped", () => {
    const band = babyFeedGuideForAge(3); // 30–60 → mid 45 → 50
    assert.equal(babyFormulaDefaultMl(band), 50);
  });

  it("fallback is 60–150 with default 120 and no feeds/day cap", () => {
    assert.equal(BABY_FEED_GUIDE_FALLBACK.mlMin, 60);
    assert.equal(BABY_FEED_GUIDE_FALLBACK.mlMax, 150);
    assert.equal(babyFormulaDefaultMl(BABY_FEED_GUIDE_FALLBACK), 120);
    assert.equal(BABY_FEED_GUIDE_FALLBACK.feedsMax, Number.POSITIVE_INFINITY);
  });
});

describe("babySuggestedBottleMl", () => {
  it("uses mid-band when weight missing", () => {
    assert.equal(babySuggestedBottleMl({ ageDays: 3 }), 50);
    assert.equal(babySuggestedBottleMl({ ageDays: null }), 120);
  });

  it("uses kg × 150 ÷ feedsDayMid under 6 months", () => {
    // day 30 → 90–150, feeds 6–8, mid feeds = 7
    // 4.2 * 150 / 7 = 90 → round10 = 90
    assert.equal(
      babySuggestedBottleMl({ ageDays: 30, weightKg: 4.2 }),
      90,
    );
    // 5.5 * 150 / 7 ≈ 117.86 → 120, clamped in 90–150
    assert.equal(
      babySuggestedBottleMl({ ageDays: 30, weightKg: 5.5 }),
      120,
    );
  });

  it("clamps weight×150 below mlMin and above mlMax", () => {
    // day 30 band 90–150, feeds mid 7
    // 3.0 * 150 / 7 ≈ 64.3 → round10 60 → clamp to 90
    assert.equal(
      babySuggestedBottleMl({ ageDays: 30, weightKg: 3 }),
      90,
    );
    // 8.0 * 150 / 7 ≈ 171.4 → round10 170 → clamp to 150
    assert.equal(
      babySuggestedBottleMl({ ageDays: 30, weightKg: 8 }),
      150,
    );
  });

  it("ignores weight at or after 183 days", () => {
    const mid = babyFormulaDefaultMl(babyFeedGuideForAge(183));
    assert.equal(
      babySuggestedBottleMl({ ageDays: 183, weightKg: 8 }),
      mid,
    );
    const mid184 = babyFormulaDefaultMl(babyFeedGuideForAge(184));
    assert.equal(
      babySuggestedBottleMl({ ageDays: 184, weightKg: 8 }),
      mid184,
    );
  });
});

describe("babySleepGuideForAge", () => {
  it("returns null when ageDays is null (no fake blend)", () => {
    assert.equal(babySleepGuideForAge(null), null);
  });

  it("maps inclusive maxDay boundaries from design", () => {
    const cases: Array<{ day: number; blendKey: string }> = [
      { day: 0, blendKey: "home.header.nap.blend0to1Mo" },
      { day: 30, blendKey: "home.header.nap.blend0to1Mo" },
      { day: 31, blendKey: "home.header.nap.blend1to2Mo" },
      { day: 60, blendKey: "home.header.nap.blend1to2Mo" },
      { day: 61, blendKey: "home.header.nap.blend3to4Mo" },
      { day: 122, blendKey: "home.header.nap.blend3to4Mo" },
      { day: 123, blendKey: "home.header.nap.blend5to6Mo" },
      { day: 183, blendKey: "home.header.nap.blend5to6Mo" },
      { day: 184, blendKey: "home.header.nap.blend7to12Mo" },
      { day: 365, blendKey: "home.header.nap.blend7to12Mo" },
      { day: 366, blendKey: "home.header.nap.blend1to3Y" },
      { day: 1095, blendKey: "home.header.nap.blend1to3Y" },
      // Past 1–3y keeps last toddler band
      { day: 1096, blendKey: "home.header.nap.blend1to3Y" },
      { day: 2000, blendKey: "home.header.nap.blend1to3Y" },
    ];
    for (const c of cases) {
      const band = babySleepGuideForAge(c.day);
      assert.ok(band, `day ${c.day} should have a band`);
      assert.equal(band!.blendKey, c.blendKey, `day ${c.day}`);
    }
  });
});

describe("buildBabyBottleChipMls", () => {
  const snaps = [60, 70, 80, 90, 100, 110, 120];

  it("puts history first then fills snaps skipping duplicates", () => {
    assert.deepEqual(
      buildBabyBottleChipMls({ recentBottleMl: [90], snaps, limit: 3 }),
      [90, 60, 70],
    );
  });

  it("uses first 3 snaps when history empty", () => {
    assert.deepEqual(
      buildBabyBottleChipMls({ recentBottleMl: [], snaps, limit: 3 }),
      [60, 70, 80],
    );
  });

  it("keeps 3 history values without snap fill", () => {
    assert.deepEqual(
      buildBabyBottleChipMls({
        recentBottleMl: [150, 120, 90],
        snaps,
        limit: 3,
      }),
      [150, 120, 90],
    );
  });

  it("ignores non-positive and non-finite ml in history", () => {
    assert.deepEqual(
      buildBabyBottleChipMls({
        recentBottleMl: [0, -10, Number.NaN, 90, Number.POSITIVE_INFINITY],
        snaps,
        limit: 3,
      }),
      [90, 60, 70],
    );
  });

  it("no-birth fixed snaps fill empty history", () => {
    assert.deepEqual(
      buildBabyBottleChipMls({
        recentBottleMl: [],
        snaps: [...BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS],
        limit: 3,
      }),
      [60, 90, 120],
    );
    assert.deepEqual(BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS, [60, 90, 120]);
  });
});
