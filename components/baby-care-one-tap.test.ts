import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { babyCareTimerStopFeedInput } from "@/lib/baby-breast-timer-store";

describe("feed / diaper / sleep one-tap chrome (no extra Save)", () => {
  const feedSrc = readFileSync(
    resolve(process.cwd(), "components/baby-feed-form.tsx"),
    "utf8",
  );
  const diaperSrc = readFileSync(
    resolve(process.cwd(), "components/baby-diaper-form.tsx"),
    "utf8",
  );
  const sleepSrc = readFileSync(
    resolve(process.cwd(), "components/baby-sleep-form.tsx"),
    "utf8",
  );
  const homeSrc = readFileSync(
    resolve(process.cwd(), "components/baby-home.tsx"),
    "utf8",
  );

  function sliceFn(src: string, startMarker: string, endMarker: string): string {
    const start = src.indexOf(startMarker);
    assert.ok(start >= 0, `missing ${startMarker}`);
    const end = src.indexOf(endMarker, start);
    assert.ok(end > start, `missing end after ${startMarker}`);
    return src.slice(start, end);
  }

  it("feed timed sides + formula ml mutate createBabyFeed — no Save", () => {
    assert.match(feedSrc, /BabyBreastSidePair/);
    assert.match(feedSrc, /BabyMlChipSection/);
    assert.match(feedSrc, /pressBreastSide/);
    assert.match(feedSrc, /logFormula/);
    assert.match(feedSrc, /home\.tapToStop/);
    assert.doesNotMatch(feedSrc, /pump_l/);
    assert.match(feedSrc, /babyCareTimerStopFeedInput/);
    assert.match(feedSrc, /createBabyFeed/);
    assert.match(feedSrc, /runBabyCareSaveThenNavigate/);
    assert.match(feedSrc, /BABY_CARE_DONE_BEFORE_NAV_MS/);

    assert.doesNotMatch(feedSrc, /data-testid="baby-feed-save"/);
    assert.doesNotMatch(feedSrc, /onClick=\{save\}/);
    assert.doesNotMatch(feedSrc, /from "@\/components\/ui\/button"/);
    assert.doesNotMatch(feedSrc, /afterSave: BABY_CARE_AFTER_SAVE\.growth/);
  });

  it("feed breast stop builds createBabyFeed duration payload", () => {
    assert.deepEqual(
      babyCareTimerStopFeedInput("breast_l", 1_700_000_000_000, 1_700_000_000_000),
      { method: "breast_l", durationSec: 1 },
    );
    assert.deepEqual(
      babyCareTimerStopFeedInput("breast_l", 1_700_000_000_000, 1_700_000_005_500),
      { method: "breast_l", durationSec: 5 },
    );
    assert.match(feedSrc, /babyCareTimerStopFeedInput\(\s*side,/);
  });

  it("feed timed sides use care-timer slots — not SLEEP session", () => {
    assert.match(feedSrc, /writeBabyCareTimerSlots|withCareTimerSide/);
    assert.doesNotMatch(feedSrc, /kind: "SLEEP"/);
    assert.doesNotMatch(feedSrc, /startBabySleep/);
  });

  it("diaper kind control + sheet is the create path — no required Save", () => {
    assert.match(diaperSrc, /BabyDiaperKindControl/);
    assert.match(diaperSrc, /BabyDiaperDetailSheet/);
    assert.match(diaperSrc, /onPlan/);
    assert.match(diaperSrc, /saveDiaper/);
    assert.match(diaperSrc, /babyHomeDiaperDoneKind/);
    assert.match(diaperSrc, /BABY_CARE_DONE_BEFORE_NAV_MS/);

    const saveBody = sliceFn(diaperSrc, "function saveDiaper(", "function onPlan(");
    assert.match(saveBody, /babyGraphQLRequest\(MUTATION/);
    assert.match(saveBody, /runBabyCareSaveThenNavigate/);
    assert.match(diaperSrc, /createBabyDiaper/);

    assert.doesNotMatch(diaperSrc, /data-testid="baby-diaper-save"/);
    assert.doesNotMatch(diaperSrc, /onClick=\{save\}/);
    assert.doesNotMatch(diaperSrc, /from "@\/components\/ui\/button"/);
  });

  it("sleep TimedCareChip uses SLEEP open-session — Done only after End", () => {
    // Intentional out-of-scope for API/DB hardening: smoke on main needs this
    // Done-flash contract sync. Pending-duration path arms Done; open-session still forbids it.
    assert.match(sleepSrc, /BabyTimedCareChip/);
    assert.match(sleepSrc, /home\.tapToStop/);
    assert.match(sleepSrc, /function start\(\)/);
    assert.match(sleepSrc, /function end\(\)/);
    assert.match(sleepSrc, /babyGraphQLRequest\(START/);
    assert.match(sleepSrc, /babyGraphQLRequest\(END/);
    assert.match(sleepSrc, /endedSleepSession:\s*true/);
    assert.match(sleepSrc, /BABY_CARE_DONE_BEFORE_NAV_MS/);
    // Open-session start must not arm Done; duration-end-in-start may.
    const startBody = sliceFn(sleepSrc, "function start(", "function end(");
    const openSessionStart = startBody.replace(
      /if \(endedWithDuration\) \{[\s\S]*?\n          \}/g,
      "",
    );
    assert.doesNotMatch(openSessionStart, /setSleepDone\(true\)/);
    assert.doesNotMatch(openSessionStart, /babyHomeSleepDoneFlash/);
    // Pending custom duration ends inside start → Done flash is allowed.
    assert.match(
      startBody,
      /if \(endedWithDuration\) \{[\s\S]*?babyHomeSleepDoneFlash\([\s\S]*?setSleepDone\(true\)/,
    );
    assert.doesNotMatch(sleepSrc, /careTimer|writeBabyCareTimer|BREAST|pump_l/);
    assert.doesNotMatch(sleepSrc, /data-testid="baby-sleep-save"/);
    assert.match(sleepSrc, /t\("sleep\.retryCheck"\)/);
  });

  it("home Nap (adapter 2) presses SLEEP only — no care-timer side start", () => {
    const napStart = homeSrc.indexOf('data-section="nap"');
    const diaperStart = homeSrc.indexOf('data-section="diaper"');
    assert.ok(napStart >= 0 && diaperStart > napStart);
    const napSlice = homeSrc.slice(napStart, diaperStart);
    assert.match(napSlice, /BabyTimedCareChip/);
    assert.match(napSlice, /kind: "SLEEP"/);
    assert.match(napSlice, /home\.tapToStop/);
    assert.doesNotMatch(napSlice, /startBabyCareTimer|writeBabyCareTimer/);
    assert.doesNotMatch(napSlice, /kind: "BREAST"/);
    assert.doesNotMatch(napSlice, /pump_l|pump_r/);
  });

  it("feed breast pair + sleep chip keep night hit targets via TimedCareChip", () => {
    assert.match(feedSrc, /BabyBreastSidePair/);
    assert.match(sleepSrc, /BabyTimedCareChip/);
    const chipSrc = readFileSync(
      resolve(process.cwd(), "components/baby-timed-care-chip.tsx"),
      "utf8",
    );
    assert.match(chipSrc, /fx-hit-40/);
    const pairSrc = readFileSync(
      resolve(process.cwd(), "components/baby-breast-side-pair.tsx"),
      "utf8",
    );
    assert.match(pairSrc, /BabyTimedCareChip/);
  });
});
