import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyCareIntervalGuideForAge,
  babyNextDiaperDue,
  babyNextFeedDue,
  babyNextSleepDue,
  formatBabyNextDueLabel,
} from "@/lib/baby-next-due";

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

describe("babyCareIntervalGuideForAge", () => {
  it("returns null for null age", () => {
    assert.equal(babyCareIntervalGuideForAge(null), null);
  });

  it("matches day-bound table (earlier feed/sleep/diaper bounds)", () => {
    // 0–1 mo: breast 2h / formula 3h / sleep 50m / diaper 2h
    const newborn = babyCareIntervalGuideForAge(0)!;
    assert.equal(newborn.feedBreastMinMs, 2 * HOUR);
    assert.equal(newborn.feedFormulaMinMs, 3 * HOUR);
    assert.equal(newborn.feedDefaultMinMs, 2 * HOUR);
    assert.equal(newborn.sleepAwakeMinMs, 50 * MIN);
    assert.equal(newborn.diaperMinMs, 2 * HOUR);

    // 1–<2 mo: feed 2.5h sleep 60m
    const m1 = babyCareIntervalGuideForAge(31)!;
    assert.equal(m1.feedDefaultMinMs, 2.5 * HOUR);
    assert.equal(m1.sleepAwakeMinMs, 60 * MIN);

    // 2–<3 mo: sleep 1.5h
    const m2 = babyCareIntervalGuideForAge(61)!;
    assert.equal(m2.sleepAwakeMinMs, 1.5 * HOUR);

    // 1–3y: feed 3h sleep 5h diaper 4h
    const y1 = babyCareIntervalGuideForAge(365)!;
    assert.equal(y1.feedDefaultMinMs, 3 * HOUR);
    assert.equal(y1.sleepAwakeMinMs, 5 * HOUR);
    assert.equal(y1.diaperMinMs, 4 * HOUR);
  });

  it("holds last band for ageDays >= 1095", () => {
    const last = babyCareIntervalGuideForAge(1094)!;
    const hold = babyCareIntervalGuideForAge(1095)!;
    const older = babyCareIntervalGuideForAge(2000)!;
    assert.deepEqual(hold, last);
    assert.deepEqual(older, last);
  });
});

describe("babyNextFeedDue method mapping", () => {
  const now = Date.UTC(2026, 6, 4, 12, 0, 0);
  const last = now - HOUR;

  it("newborn breast → 2h; formula → 3h; pump/null/unknown → feedDefaultMinMs", () => {
    const breast = babyNextFeedDue({
      now,
      ageDays: 0,
      lastFeedAt: last,
      lastFeedMethod: "breast_l",
    });
    assert.equal(breast.kind, "next");
    if (breast.kind === "next") {
      assert.equal(breast.dueAt, last + 2 * HOUR);
    }

    const formula = babyNextFeedDue({
      now,
      ageDays: 0,
      lastFeedAt: last,
      lastFeedMethod: "formula",
    });
    assert.equal(formula.kind, "next");
    if (formula.kind === "next") {
      assert.equal(formula.dueAt, last + 3 * HOUR);
    }

    for (const method of ["pump", null, "weird"] as const) {
      const due = babyNextFeedDue({
        now,
        ageDays: 0,
        lastFeedAt: last,
        lastFeedMethod: method as "pump" | null,
      });
      assert.equal(due.kind, "next");
      if (due.kind === "next") {
        assert.equal(due.dueAt, last + 2 * HOUR); // feedDefaultMinMs newborn
      }
    }
  });

  it("older bands always use feedDefaultMinMs for every method", () => {
    const due = babyNextFeedDue({
      now,
      ageDays: 100,
      lastFeedAt: last,
      lastFeedMethod: "breast_l",
    });
    const guide = babyCareIntervalGuideForAge(100)!;
    assert.equal(due.kind, "next");
    if (due.kind === "next") {
      assert.equal(due.dueAt, last + guide.feedDefaultMinMs);
    }
  });

  it("hides with no last feed or no age; overdue when past due", () => {
    assert.equal(
      babyNextFeedDue({
        now,
        ageDays: null,
        lastFeedAt: last,
        lastFeedMethod: "formula",
      }).kind,
      "hidden",
    );
    assert.equal(
      babyNextFeedDue({
        now,
        ageDays: 0,
        lastFeedAt: null,
        lastFeedMethod: "formula",
      }).kind,
      "hidden",
    );
    const overdue = babyNextFeedDue({
      now: last + 3 * HOUR + 1,
      ageDays: 0,
      lastFeedAt: last,
      lastFeedMethod: "formula",
    });
    assert.equal(overdue.kind, "overdue");
  });
});

describe("babyNextSleepDue and babyNextDiaperDue", () => {
  const now = Date.UTC(2026, 6, 4, 12, 0, 0);

  it("sleep hides when nap open; uses lastSleepEndedAt only", () => {
    assert.equal(
      babyNextSleepDue({
        now,
        ageDays: 0,
        lastSleepEndedAt: now - HOUR,
        napOpen: true,
      }).kind,
      "hidden",
    );
    const due = babyNextSleepDue({
      now,
      ageDays: 0,
      lastSleepEndedAt: now - 10 * MIN,
      napOpen: false,
    });
    assert.equal(due.kind, "next");
  });

  it("diaper hides with no last; otherwise next/overdue", () => {
    assert.equal(
      babyNextDiaperDue({ now, ageDays: 0, lastDiaperAt: null }).kind,
      "hidden",
    );
    const due = babyNextDiaperDue({
      now,
      ageDays: 0,
      lastDiaperAt: now - HOUR,
    });
    assert.equal(due.kind, "next");
  });
});

describe("formatBabyNextDueLabel", () => {
  it("returns null for hidden; passes { duration } into keys", () => {
    assert.equal(
      formatBabyNextDueLabel({ kind: "hidden" }, () => "x"),
      null,
    );
    const keys: string[] = [];
    const vars: unknown[] = [];
    formatBabyNextDueLabel(
      { kind: "next", dueAt: 0, remainingMs: 5 * MIN },
      (key, v) => {
        keys.push(key);
        vars.push(v);
        return `next in ${v.duration}`;
      },
      "en",
    );
    assert.deepEqual(keys, ["home.nextIn"]);
    assert.deepEqual(vars, [{ duration: "5min" }]);

    formatBabyNextDueLabel(
      { kind: "overdue", dueAt: 0, overdueMs: 10 * MIN },
      (key, v) => {
        keys.push(key);
        vars.push(v);
        return `${v.duration} overdue`;
      },
      "en",
    );
    assert.equal(keys[1], "home.overdue");
    assert.deepEqual(vars[1], { duration: "10min" });
  });

  it("uses VI phút for next-in and overdue", () => {
    const next = formatBabyNextDueLabel(
      { kind: "next", dueAt: 0, remainingMs: 5 * MIN },
      (key, v) => `${key}:${v.duration}`,
      "vi",
    );
    assert.equal(next, "home.nextIn:5 phút");

    const overdue = formatBabyNextDueLabel(
      { kind: "overdue", dueAt: 0, overdueMs: 5 * MIN },
      (key, v) => `${key}:${v.duration}`,
      "vi",
    );
    assert.equal(overdue, "home.overdue:5 phút");
  });
});
