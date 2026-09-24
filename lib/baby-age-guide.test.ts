import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS,
  BABY_FEED_GUIDE_FALLBACK,
  ESSAY_BOTTLE_ML_FIXTURES,
  babyAgeInDays,
  babyAgeInMonthsFloor,
  babyBreastSessionGuideForAge,
  babyBottleSnapsForBand,
  babyCareGuideStageForAge,
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

describe("babyFeedGuideForAge — essay bottle bands", () => {
  it("maps essay day cuts and bottle feedsMin/feedsMax", () => {
    const cases: Array<{
      day: number;
      mlMin: number;
      mlMax: number;
      feedsMin: number;
      feedsMax: number;
    }> = [
      { day: 0, mlMin: 30, mlMax: 60, feedsMin: 7, feedsMax: 8 },
      { day: 30, mlMin: 30, mlMax: 60, feedsMin: 7, feedsMax: 8 },
      { day: 45, mlMin: 90, mlMax: 120, feedsMin: 6, feedsMax: 8 },
      { day: 60, mlMin: 90, mlMax: 120, feedsMin: 6, feedsMax: 8 },
      { day: 75, mlMin: 120, mlMax: 150, feedsMin: 6, feedsMax: 8 },
      { day: 90, mlMin: 120, mlMax: 150, feedsMin: 6, feedsMax: 8 },
      { day: 120, mlMin: 150, mlMax: 210, feedsMin: 5, feedsMax: 6 },
      { day: 182, mlMin: 150, mlMax: 210, feedsMin: 5, feedsMax: 6 },
      { day: 200, mlMin: 180, mlMax: 240, feedsMin: 3, feedsMax: 4 },
      { day: 364, mlMin: 180, mlMax: 240, feedsMin: 3, feedsMax: 4 },
      { day: 365, mlMin: 120, mlMax: 180, feedsMin: 2, feedsMax: 3 },
      { day: 900, mlMin: 120, mlMax: 180, feedsMin: 2, feedsMax: 3 },
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

  it("ESSAY_BOTTLE_ML_FIXTURES match guide bands (cross-app checklist)", () => {
    for (const [name, fx] of Object.entries(ESSAY_BOTTLE_ML_FIXTURES)) {
      const band = babyFeedGuideForAge(fx.day);
      assert.equal(band.mlMin, fx.mlMin, `${name} mlMin`);
      assert.equal(band.mlMax, fx.mlMax, `${name} mlMax`);
      assert.deepEqual(
        babyBottleSnapsForBand(band),
        [...fx.snaps],
        `${name} snaps`,
      );
    }
  });
});

describe("babyBreastSessionGuideForAge", () => {
  it("uses essay breast counts — not bottle feeds", () => {
    assert.deepEqual(babyBreastSessionGuideForAge(0), {
      feedsMin: 8,
      feedsMax: 12,
    });
    const bottle = babyFeedGuideForAge(0);
    assert.equal(bottle.feedsMin, 7);
    assert.equal(bottle.feedsMax, 8);
    assert.notEqual(bottle.feedsMin, babyBreastSessionGuideForAge(0)!.feedsMin);
    assert.deepEqual(babyBreastSessionGuideForAge(45), {
      feedsMin: 6,
      feedsMax: 8,
    });
    assert.deepEqual(babyBreastSessionGuideForAge(120), {
      feedsMin: 5,
      feedsMax: 6,
    });
    assert.equal(babyBreastSessionGuideForAge(200), null);
    assert.equal(babyBreastSessionGuideForAge(400), null);
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
    assert.equal(
      babySuggestedBottleMl({ ageDays: 45, weightKg: 4.2 }),
      90,
    );
    assert.equal(
      babySuggestedBottleMl({ ageDays: 45, weightKg: 5.5 }),
      120,
    );
  });

  it("clamps weight×150 below mlMin and above mlMax", () => {
    assert.equal(
      babySuggestedBottleMl({ ageDays: 45, weightKg: 3 }),
      90,
    );
    assert.equal(
      babySuggestedBottleMl({ ageDays: 45, weightKg: 8 }),
      120,
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

  it("maps five essay sleep stages", () => {
    const cases: Array<{ day: number; blendKey: string }> = [
      { day: 0, blendKey: "home.header.nap.blend0to1Mo" },
      { day: 30, blendKey: "home.header.nap.blend0to1Mo" },
      { day: 31, blendKey: "home.header.nap.blend1to3Mo" },
      { day: 90, blendKey: "home.header.nap.blend1to3Mo" },
      { day: 91, blendKey: "home.header.nap.blend3to6Mo" },
      { day: 182, blendKey: "home.header.nap.blend3to6Mo" },
      { day: 183, blendKey: "home.header.nap.blend6to12Mo" },
      { day: 364, blendKey: "home.header.nap.blend6to12Mo" },
      { day: 365, blendKey: "home.header.nap.blend12to24Mo" },
      { day: 2000, blendKey: "home.header.nap.blend12to24Mo" },
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

describe("babyAgeInMonthsFloor", () => {
  it("floors ageDays / 30.4375", () => {
    assert.equal(babyAgeInMonthsFloor(0), 0);
    assert.equal(babyAgeInMonthsFloor(30), 0);
    assert.equal(babyAgeInMonthsFloor(31), 1);
    assert.equal(babyAgeInMonthsFloor(91), 2);
  });
});

describe("babyCareGuideStageForAge", () => {
  it("maps design cuts; null age → null", () => {
    assert.equal(babyCareGuideStageForAge(null), null);
    assert.equal(babyCareGuideStageForAge(0), "newborn");
    assert.equal(babyCareGuideStageForAge(30), "newborn");
    assert.equal(babyCareGuideStageForAge(31), "m1_3");
    assert.equal(babyCareGuideStageForAge(90), "m1_3");
    assert.equal(babyCareGuideStageForAge(91), "m3_6");
    assert.equal(babyCareGuideStageForAge(182), "m3_6");
    assert.equal(babyCareGuideStageForAge(183), "m6_12");
    assert.equal(babyCareGuideStageForAge(364), "m6_12");
    assert.equal(babyCareGuideStageForAge(365), "m12_24");
  });
});
