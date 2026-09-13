import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import {
  attachBabyLocalDayRoll,
  babyLocalDayWindow,
  msUntilNextLocalMidnight,
  nextBabyLocalDayIfChanged,
} from "@/lib/baby-home-day-window";

describe("babyLocalDayWindow", () => {
  it("returns half-open local day with stable dayKey", () => {
    const a = new Date(2026, 6, 4, 1, 0, 0);
    const b = new Date(2026, 6, 4, 23, 59, 0);
    const wa = babyLocalDayWindow(a);
    const wb = babyLocalDayWindow(b);
    assert.equal(wa.dayKey, "2026-07-04");
    assert.equal(wb.dayKey, "2026-07-04");
    assert.equal(wa.from, wb.from);
    assert.equal(wa.to, wb.to);
    assert.ok(wa.from.includes("T00:00:00"));
    assert.ok(Date.parse(wa.to) > Date.parse(wa.from));
  });

  it("advances dayKey after local midnight", () => {
    const before = babyLocalDayWindow(new Date(2026, 6, 4, 23, 59, 0));
    const after = babyLocalDayWindow(new Date(2026, 6, 5, 0, 1, 0));
    assert.equal(before.dayKey, "2026-07-04");
    assert.equal(after.dayKey, "2026-07-05");
  });
});

describe("msUntilNextLocalMidnight", () => {
  it("never returns 0 or negative; floors at 1000 ms", () => {
    const almost = new Date(2026, 6, 4, 23, 59, 59, 999);
    const ms = msUntilNextLocalMidnight(almost);
    assert.ok(ms >= 1000);
    const atMidnight = new Date(2026, 6, 5, 0, 0, 0, 0);
    assert.ok(msUntilNextLocalMidnight(atMidnight) >= 1000);
  });

  it("uses calendar next midnight (not now+24h)", () => {
    const noon = new Date(2026, 6, 4, 12, 0, 0);
    const ms = msUntilNextLocalMidnight(noon);
    const expected =
      new Date(2026, 6, 5, 0, 0, 0, 0).getTime() - noon.getTime();
    assert.equal(ms, expected);
  });

  it("23h spring-forward and 25h fall-back under America/New_York", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        `
import assert from "node:assert/strict";
import {
  babyLocalDayWindow,
  msUntilNextLocalMidnight,
} from "./lib/baby-home-day-window.ts";

const springNoon = new Date(2026, 2, 8, 12, 0, 0);
const springWin = babyLocalDayWindow(springNoon);
const springLen = Date.parse(springWin.to) - Date.parse(springWin.from);
assert.equal(springLen, 23 * 60 * 60 * 1000);
assert.equal(
  msUntilNextLocalMidnight(springNoon),
  Date.parse(springWin.to) - springNoon.getTime(),
);

const fallNoon = new Date(2026, 10, 1, 12, 0, 0);
const fallWin = babyLocalDayWindow(fallNoon);
const fallLen = Date.parse(fallWin.to) - Date.parse(fallWin.from);
assert.equal(fallLen, 25 * 60 * 60 * 1000);
console.log("ok");
`,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, TZ: "America/New_York" },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /ok/);
  });
});

describe("nextBabyLocalDayIfChanged", () => {
  it("returns null when dayKey is unchanged", () => {
    const noon = new Date(2026, 6, 4, 12, 0, 0);
    assert.equal(nextBabyLocalDayIfChanged("2026-07-04", noon), null);
  });

  it("returns today’s window after local midnight", () => {
    const after = new Date(2026, 6, 5, 0, 1, 0);
    const next = nextBabyLocalDayIfChanged("2026-07-04", after);
    assert.ok(next);
    assert.equal(next.dayKey, "2026-07-05");
  });
});

describe("attachBabyLocalDayRoll", () => {
  it("rolls on visibility wake after midnight (not only setTimeout)", () => {
    let nowMs = new Date(2026, 6, 4, 23, 50, 0).getTime();
    const rolls: string[] = [];
    const visibility: Array<() => void> = [];
    const focus: Array<() => void> = [];
    let timerFn: (() => void) | null = null;

    const dispose = attachBabyLocalDayRoll(
      (now) => {
        rolls.push(babyLocalDayWindow(now).dayKey);
      },
      {
        now: () => new Date(nowMs),
        setTimeout: (fn) => {
          timerFn = fn;
          return 1;
        },
        clearTimeout: () => {},
        addVisibilityListener: (fn) => visibility.push(fn),
        removeVisibilityListener: () => {},
        addFocusListener: (fn) => focus.push(fn),
        removeFocusListener: () => {},
      },
    );

    assert.equal(visibility.length, 1);
    assert.equal(focus.length, 1);
    assert.equal(rolls.length, 0);

    // Phone slept past midnight; timer may be throttled — wake must roll.
    nowMs = new Date(2026, 6, 5, 0, 30, 0).getTime();
    visibility[0]!();
    assert.deepEqual(rolls, ["2026-07-05"]);

    // Focus path also rolls (same handler).
    nowMs = new Date(2026, 6, 5, 1, 0, 0).getTime();
    focus[0]!();
    assert.deepEqual(rolls, ["2026-07-05", "2026-07-05"]);

    assert.equal(typeof timerFn, "function");
    dispose();
  });
});
