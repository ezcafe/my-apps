import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyHomeContent } from "@/components/baby-home";
import { t } from "@/lib/baby-i18n";
import {
  BABY_QUICK_PENDING_RETRY_MAX_AGE_MS,
  babyQuickShouldAutoRetryOnMount,
  type BabyQuickPending,
} from "@/lib/baby-quick-care-pending";

const emptyStatus = {
  lastFeed: null,
  lastPump: null,
  lastSleep: null,
  lastDiaper: null,
  openSleep: null,
  feedsToday: 0,
  birthDate: null,
  latestWeightKg: null,
  recentBottleMl: [] as number[],
};

const now = 1_700_000_000_000;

function pendingFormula(amountMl: number): BabyQuickPending {
  return {
    babyId: "b1",
    requestId: "req-stored-01",
    request: {
      action: { kind: "FORMULA", amountMl },
      breastRunning: null,
    },
    state: "unknown",
    startedAt: now - 60_000,
  };
}

function pendingBreastSending(): BabyQuickPending {
  return {
    babyId: "b1",
    requestId: "req-breast-send",
    request: {
      action: { kind: "BREAST", side: "breast_l" },
      breastRunning: null,
    },
    state: "sending",
    startedAt: now - 5_000,
  };
}

function pendingSending(
  action: BabyQuickPending["request"]["action"],
): BabyQuickPending {
  return {
    babyId: "b1",
    requestId: `req-${action.kind}-send`,
    request: { action, breastRunning: null },
    state: "sending",
    startedAt: now - 5_000,
  };
}

function pendingUnknown(
  action: BabyQuickPending["request"]["action"],
): BabyQuickPending {
  return {
    babyId: "b1",
    requestId: `req-${action.kind}-unk`,
    request: { action, breastRunning: null },
    state: "unknown",
    startedAt: now - 60_000,
  };
}

/** Recovery must sit between this chip's open and the next chip/section. */
function assertRecoveryNestedInChip(
  markup: string,
  chipTestId: string,
  owner: string,
  nextMarker: string,
) {
  const chipIdx = markup.indexOf(`data-testid="${chipTestId}"`);
  const nextIdx = markup.indexOf(nextMarker, chipIdx + 1);
  assert.ok(chipIdx >= 0, `missing chip ${chipTestId}`);
  assert.ok(nextIdx > chipIdx, `missing next marker ${nextMarker}`);
  const nested = markup.slice(chipIdx, nextIdx);
  assert.match(
    nested,
    new RegExp(
      `data-testid="baby-home-pending-recovery"[^>]*data-pending-owner="${owner}"`,
    ),
  );
  assert.match(nested, /Try again/);
}

function countRecovery(markup: string): number {
  return (markup.match(/data-testid="baby-home-pending-recovery"/g) ?? [])
    .length;
}

function homeProps(
  overrides: Partial<{
    pendingSeed: BabyQuickPending | null;
    savingSeed: boolean;
    messageSeed: string | null;
  }> = {},
) {
  return {
    status: emptyStatus,
    statusLoading: false,
    statusError: false,
    onRetryStatus: () => {},
    babyId: "b1",
    t: (key: string) => t(key as never, "en"),
    locale: "en" as const,
    nowMs: now,
    ...overrides,
  };
}

describe("BabyHomeContent", () => {
  it("shows error and keeps breast/bottle/diaper; sleep fails closed", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: null,
        statusLoading: false,
        statusError: true,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
      }),
    );
    assert.match(markup, /data-testid="baby-home-status"/);
    assert.match(markup, /Could not load\. You can still log care below\./);
    assert.doesNotMatch(markup, /href="\/baby\/feed"/);
    assert.match(markup, /Left/);
    assert.match(markup, /Bottle/);
    assert.match(markup, /Could not check nap status/);
    assert.match(markup, /Retry/);
  });

  it("shows cleaned feed status without leading ml or n/N today", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          feedsToday: 1,
          recentBottleMl: [120],
          lastFeed: {
            id: "f1",
            at: new Date(now - 60_000).toISOString(),
            endedAt: null,
            payload: { method: "formula", amountMl: 120 },
            summary: "Feed (Formula 120 ml)",
          },
        },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
      }),
    );
    assert.match(markup, /Last feed was a bottle of/);
    assert.match(markup, /120 ml/);
    assert.match(markup, /font-medium text-foreground tabular-nums/);
    assert.doesNotMatch(markup, /Feed \(Formula 120 ml\) ·/);
    assert.doesNotMatch(markup, /120 ml · Feed/);
    assert.doesNotMatch(markup, /\d+\/\d+ today/);
    assert.match(markup, /data-layout="bottle-ml-chips"/);
    assert.match(markup, /data-layout="diaper-kind-2x2"/);
    assert.match(markup, /data-section="breast"/);
    assert.match(markup, /data-section="bottle"/);
    assert.match(markup, /data-section="nap"/);
    assert.match(markup, /data-section="diaper"/);
    assert.doesNotMatch(markup, /data-layout="b1-bottle"/);
    assert.doesNotMatch(markup, /data-layout="home-row-2"/);
    assert.match(markup, /fx-ripple/);
  });

  it("empty feed status has no progress suffix", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: { ...emptyStatus, feedsToday: 2, birthDate: null },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
      }),
    );
    const statusIdx = markup.indexOf('data-testid="baby-home-status"');
    const statusChunk = markup.slice(statusIdx);
    assert.match(statusChunk, /No feed logged yet/);
    assert.doesNotMatch(statusChunk, /2 today/);
    assert.doesNotMatch(statusChunk, /\d+\/\d+/);
  });

  it("Custom confirm still sets formulaFromCustom (no auto-save in modal)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-home.tsx"),
      "utf8",
    );
    assert.match(src, /formulaFromCustom/);
    assert.match(src, /setFormulaFromCustom\(true\)/);
    const onConfirmStart = src.indexOf("onConfirm={(ml) => {");
    assert.ok(onConfirmStart >= 0, "Custom onConfirm handler");
    const onConfirmEnd = src.indexOf("}", onConfirmStart);
    const onConfirmBody = src.slice(onConfirmStart, onConfirmEnd);
    assert.doesNotMatch(
      onConfirmBody,
      /runQuick/,
      "confirm sets ml only — chip tap saves",
    );
  });

  it("bottle chips replace face steppers (no More/Less on home)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-home.tsx"),
      "utf8",
    );
    assert.match(src, /BabyMlChipSection/);
    assert.match(src, /BabyBreastSidePair/);
    assert.match(src, /BabyPumpSidePair/);
    assert.doesNotMatch(src, /BabyQuickValueCard/);
    assert.doesNotMatch(src, /stepBabyFormulaMl/);
  });

  it("re-reads pending from localStorage after mount (SSR hydrate)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-home.tsx"),
      "utf8",
    );
    // After mount, re-read LS so SSR null does not drop a stored pending bar.
    assert.match(
      src,
      /SSR init is null; re-read localStorage after mount/,
    );
    assert.match(src, /setPending\(readBabyQuickPending\(localStorage/);
  });

  it("sets inFlightRef before the first await in runQuick", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-home.tsx"),
      "utf8",
    );
    const start = src.indexOf("async function runQuick");
    const end = src.indexOf("const breastElapsed");
    assert.ok(start >= 0 && end > start);
    const body = src.slice(start, end);
    const setIdx = body.indexOf("inFlightRef.current = true");
    const awaitIdx = body.indexOf("await ");
    assert.ok(setIdx >= 0, "must set inFlightRef");
    assert.ok(awaitIdx >= 0, "runQuick awaits");
    assert.ok(
      setIdx < awaitIdx,
      "inFlightRef must be set before the first await",
    );
  });

  it("soft-invalidates after confirmed save; chainFailed only on definiteNoCommit", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-home.tsx"),
      "utf8",
    );
    const start = src.indexOf("async function runQuick");
    const end = src.indexOf("const breastElapsed");
    assert.ok(start >= 0 && end > start);
    const body = src.slice(start, end);
    assert.match(body, /softInvalidateAfterQuickCare\(onInvalidateCare\)/);
    assert.doesNotMatch(
      body,
      /await onInvalidateCare\?\.\(\)/,
      "raw onInvalidateCare must not sit in the mutation try",
    );
    const softIdx = body.indexOf("softInvalidateAfterQuickCare");
    const catchIdx = body.indexOf("} catch (error)");
    assert.ok(softIdx >= 0 && catchIdx > softIdx);
    const catchBody = body.slice(catchIdx);
    const definiteIdx = catchBody.indexOf('cls === "definiteNoCommit"');
    const chainFailedIdx = catchBody.indexOf('t("home.chainFailed")');
    assert.ok(definiteIdx >= 0, "catch classifies definiteNoCommit");
    assert.ok(
      chainFailedIdx > definiteIdx,
      "chainFailed only after definiteNoCommit branch",
    );
    // Ambiguous path keeps pending as unknown without double-shout status.
    const unknownAssign = catchBody.indexOf('state: "unknown"');
    assert.ok(unknownAssign >= 0);
    const afterUnknown = catchBody.slice(unknownAssign);
    const nextFinally = afterUnknown.indexOf("} finally");
    assert.doesNotMatch(
      afterUnknown.slice(0, nextFinally >= 0 ? nextFinally : undefined),
      /home\.chainFailed/,
      "do not set chainFailed when inline recovery will show",
    );
    // Quiet success — no Saved … banner; chip done-flash only.
    assert.equal(
      body.includes('t("home.savedFeed")'),
      false,
      "success must not set Saved feed banner",
    );
    assert.doesNotMatch(
      body,
      /setMessage\(\s*stepNames/,
      "success must not setMessage from step keys",
    );
    const savingFalseIdx = body.indexOf("setSaving(false)");
    assert.ok(
      savingFalseIdx >= 0 && savingFalseIdx < softIdx,
      "setSaving(false) must run before softInvalidate on success",
    );
    assert.match(src, /babyHomeSaveAnnouncement/);
  });

  it("renders locked rows breast+bottle → nap+diaper → pump → status → guidelines at bottom", () => {
    const clock = new Date("2026-09-12T12:00:00.000Z").getTime();
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          lastFeed: {
            id: "1",
            at: new Date(clock - 10 * 60_000).toISOString(),
            endedAt: null,
            payload: { method: "breast_l" },
            summary: "Feed (Breast L)",
          },
          feedsToday: 3,
          recentBottleMl: [90],
        },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: clock,
      }),
    );
    const breast = markup.indexOf('data-section="breast"');
    const bottle = markup.indexOf('data-section="bottle"');
    const nap = markup.indexOf('data-section="nap"');
    const diaper = markup.indexOf('data-section="diaper"');
    const pump = markup.indexOf('data-section="pump"');
    const guidelines = markup.indexOf('data-testid="baby-care-guidelines"');
    const status = markup.indexOf('data-testid="baby-home-status"');
    assert.ok(breast >= 0 && bottle > breast && nap > bottle && diaper > nap);
    assert.ok(pump > diaper && status > pump && guidelines > status);
    assert.match(markup, /data-layout="home-row-breast-bottle"/);
    assert.match(markup, /data-layout="home-row-nap-diaper"/);
    assert.match(markup, /data-layout="home-row-pump"/);
    assert.match(markup, /data-testid="baby-home-header-pump"/);
    assert.match(markup, /data-testid="baby-care-chip-pump_l"/);
    assert.match(markup, /data-testid="baby-care-chip-pump_r"/);
    assert.match(markup, /data-testid="baby-care-chip-nap"/);
    assert.match(
      markup,
      /data-section="pump-amount"[^]*?min-h-\[calc\(2\*2\.75rem\+1px\)\]/,
    );
    // Idle chips show Tap to start (not Tap to stop).
    const pumpLIdle = markup.slice(
      markup.indexOf('data-testid="baby-care-chip-pump_l"'),
      markup.indexOf('data-testid="baby-care-chip-pump_r"'),
    );
    assert.match(pumpLIdle, /Tap to start/);
    assert.doesNotMatch(pumpLIdle, /Tap to stop/);
    assert.match(markup, /aria-label="Pump amount"/);
    // Gate A2: figurative icons on every big home care control.
    assert.match(markup, /data-section="breast"[^]*?<svg/);
    assert.match(markup, /data-section="bottle"[^]*?<svg/);
    assert.match(markup, /data-section="nap"[^]*?<svg/);
    assert.match(markup, /data-section="diaper"[^]*?<svg/);
    assert.match(markup, /data-section="pump"[^]*?<svg/);
    assert.match(markup, /data-section="pump-amount"[^]*?data-layout="bottle-ml-chips"/);
  });

  it("wires tapToStop on TimedCareChip mounts (running copy contract)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-home.tsx"),
      "utf8",
    );
    // Breast/Pump pairs + Nap each get home.tapToStop.
    const tapToStopHits = src.match(/tapToStop:\s*t\("home\.tapToStop"\)/g) ?? [];
    const napTapToStop = src.match(/tapToStop=\{t\("home\.tapToStop"\)\}/g) ?? [];
    assert.ok(
      tapToStopHits.length >= 4 && napTapToStop.length >= 1,
      `expected ≥4 pair tapToStop + nap, got pairs=${tapToStopHits.length} nap=${napTapToStop.length}`,
    );
    assert.match(src, /BabyBreastSidePair/);
    assert.match(src, /BabyPumpSidePair/);
    assert.match(src, /IconBabyBottle/);
    assert.match(src, /IconBabySleep/);
    assert.match(src, /IconBabyDiaper/);
    assert.match(src, /baby-home-header-pump/);
  });

  it("idle bottle chips have no selected ml (even with last formula / recent)", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          feedsToday: 1,
          recentBottleMl: [90, 120, 150],
          lastFeed: {
            id: "f1",
            at: new Date(now - 60_000).toISOString(),
            endedAt: null,
            payload: { method: "formula", amountMl: 90 },
            summary: "Feed (Formula 90 ml)",
          },
        },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
      }),
    );
    const chipsStart = markup.indexOf('data-layout="bottle-ml-chips"');
    assert.ok(chipsStart >= 0);
    const chips = markup.slice(chipsStart, chipsStart + 2500);
    const chip90 = chips.match(/data-bottle-ml="90"[^>]*/);
    assert.ok(chip90, "90 ml chip present");
    assert.doesNotMatch(chip90![0], /data-selected/);
    assert.doesNotMatch(chips, /data-bottle-ml="\d+"[^>]*data-selected/);
  });

  it("done-flash keeps saved ml selected before status refetch", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          feedsToday: 1,
          recentBottleMl: [90, 120],
          lastFeed: {
            id: "f1",
            at: new Date(now - 60_000).toISOString(),
            endedAt: null,
            // Stale lastFeed still breast — flash must not wait on softInvalidate.
            payload: { method: "breast_l" },
            summary: "Feed (Breast L)",
          },
        },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        bottleDoneMlSeed: 150,
      }),
    );
    const chipsStart = markup.indexOf('data-layout="bottle-ml-chips"');
    assert.ok(chipsStart >= 0);
    const chips = markup.slice(chipsStart, chipsStart + 3000);
    assert.match(chips, /data-done-flash/);
    const chip150 = chips.match(/data-bottle-ml="150"[^>]*/);
    assert.ok(chip150, "flash ml chip present even if not yet in recent");
    assert.match(chip150![0], /data-selected/);
    assert.match(chip150![0], /data-bottle-flash="done"/);
    const chip90 = chips.match(/data-bottle-ml="90"[^>]*/);
    assert.ok(chip90);
    assert.doesNotMatch(chip90![0], /data-selected/);
  });

  it("breast Done flash after stop; nap Done flash after End only (not while running)", () => {
    const breastMarkup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: { ...emptyStatus, birthDate: "2026-01-01" },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        breastDoneSideSeed: "breast_l",
      }),
    );
    assert.match(
      breastMarkup,
      /data-done-flash[\s\S]*?id="baby-breast-breast_l"[^>]*>Done</,
    );

    const napDoneMarkup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: { ...emptyStatus, birthDate: "2026-01-01" },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        sleepDoneSeed: true,
      }),
    );
    const napDoneStart = napDoneMarkup.indexOf('data-section="nap"');
    assert.ok(napDoneStart >= 0);
    const napDone = napDoneMarkup.slice(napDoneStart, napDoneStart + 2000);
    assert.match(napDone, /data-done-flash/);
    assert.match(napDone, />Done</);

    const napRunningMarkup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          openSleep: {
            id: "s-open",
            occurredAt: new Date(now - 60_000).toISOString(),
          },
        },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        sleepDoneSeed: true,
      }),
    );
    const napRunStart = napRunningMarkup.indexOf('data-section="nap"');
    assert.ok(napRunStart >= 0);
    const napRun = napRunningMarkup.slice(napRunStart, napRunStart + 2500);
    assert.match(napRun, /data-running="true"/);
    assert.match(napRun, /Tap to stop/);
    assert.doesNotMatch(napRun, />Done</);
  });

  it("under-chip helpers + guidelines + pump chips present", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: { ...emptyStatus, birthDate: "2026-01-01", feedsToday: 0 },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
      }),
    );
    assert.match(markup, /data-testid="baby-home-header-breast"/);
    assert.match(markup, /data-testid="baby-home-header-bottle"/);
    assert.match(markup, /data-testid="baby-home-header-nap"/);
    assert.match(markup, /data-testid="baby-home-header-diaper"/);
    assert.match(markup, /data-testid="baby-home-header-pump"/);
    assert.match(markup, /Session side/);
    assert.match(markup, /Volume when needed/);
    assert.match(markup, /Start or end nap/);
    assert.match(markup, /Pick a kind/);
    assert.match(markup, /Timed side/);
    assert.match(markup, /data-testid="baby-care-guidelines"/);
    assert.match(markup, /data-testid="baby-guideline-feed"/);
    assert.match(markup, /data-testid="baby-guideline-pump"/);
    assert.match(markup, /aria-expanded="false"/);
    assert.doesNotMatch(
      markup,
      /Guidelines only — watch wet diapers and weight gain\./,
    );
  });

  it("EN/VI nap blend keys match full design table", () => {
    const table = [
      [
        "home.header.nap.blend0to1Mo",
        "At this age, about «16–18 hours» of sleep a day, with «4–6 naps».",
        "Ở tuổi này, khoảng «16–18 giờ» ngủ mỗi ngày, với «4–6 giấc».",
      ],
      [
        "home.header.nap.blend1to2Mo",
        "At this age, about «15–16 hours» of sleep a day, with «3–5 naps».",
        "Ở tuổi này, khoảng «15–16 giờ» ngủ mỗi ngày, với «3–5 giấc».",
      ],
      [
        "home.header.nap.blend3to4Mo",
        "At this age, about «14–15 hours» of sleep a day, with «3–4 naps».",
        "Ở tuổi này, khoảng «14–15 giờ» ngủ mỗi ngày, với «3–4 giấc».",
      ],
      [
        "home.header.nap.blend5to6Mo",
        "At this age, about «14 hours» of sleep a day, with «2–3 naps».",
        "Ở tuổi này, khoảng «14 giờ» ngủ mỗi ngày, với «2–3 giấc».",
      ],
      [
        "home.header.nap.blend7to12Mo",
        "At this age, about «13–14 hours» of sleep a day, with «2 naps».",
        "Ở tuổi này, khoảng «13–14 giờ» ngủ mỗi ngày, với «2 giấc».",
      ],
      [
        "home.header.nap.blend1to3Y",
        "At this age, about «12–13 hours» of sleep a day, with «1 nap».",
        "Ở tuổi này, khoảng «12–13 giờ» ngủ mỗi ngày, với «1 giấc».",
      ],
    ] as const;
    for (const [key, en, vi] of table) {
      assert.equal(t(key, "en"), en, `${key} EN`);
      assert.equal(t(key, "vi"), vi, `${key} VI`);
    }
  });

  it("under-owner recovery: quiet while saving; orphaned/unknown/tooOld under owner", () => {
    const none = renderToStaticMarkup(
      createElement(BabyHomeContent, homeProps({ pendingSeed: null })),
    );
    assert.doesNotMatch(none, /Try again/);
    assert.doesNotMatch(none, /could not confirm/i);
    assert.equal(countRecovery(none), 0);

    // Mid-flight start: saving + pending sending → no recovery chrome / no title text.
    const midFlight = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingBreastSending(),
          savingSeed: true,
        }),
      ),
    );
    assert.doesNotMatch(midFlight, /could not confirm/i);
    assert.doesNotMatch(midFlight, /chưa xác nhận/i);
    assert.doesNotMatch(midFlight, /Try again/);
    assert.equal(countRecovery(midFlight), 0);

    // Retry mid-flight: saving + pending still unknown → quiet.
    const retryMid = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingFormula(120),
          savingSeed: true,
        }),
      ),
    );
    assert.doesNotMatch(retryMid, /Try again/);
    assert.doesNotMatch(retryMid, /could not confirm/i);
    assert.equal(countRecovery(retryMid), 0);

    // Orphaned sending after remount (!saving) → recovery nested in Left, not Right.
    const orphaned = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingBreastSending(),
          savingSeed: false,
        }),
      ),
    );
    assertRecoveryNestedInChip(
      orphaned,
      "baby-care-chip-breast_l",
      "breast_l",
      'data-testid="baby-care-chip-breast_r"',
    );
    const rightIdx = orphaned.indexOf('data-testid="baby-care-chip-breast_r"');
    const rightChunk = orphaned.slice(
      rightIdx,
      orphaned.indexOf('data-section="bottle"', rightIdx),
    );
    assert.doesNotMatch(rightChunk, /baby-home-pending-recovery/);
    assert.doesNotMatch(rightChunk, /data-pending-owner/);
    assert.equal(countRecovery(orphaned), 1);
    // Durable page-strip contract: status region has no failure title / recovery.
    const afterStatus = orphaned.slice(
      orphaned.indexOf('data-testid="baby-home-status"'),
    );
    assert.doesNotMatch(afterStatus, /could not confirm/i);
    assert.doesNotMatch(afterStatus, /Try again/);
    assert.doesNotMatch(afterStatus, /baby-home-pending-recovery/);

    // Unknown FORMULA → recovery under bottle; matching ml chip selected.
    const formula = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({ pendingSeed: pendingFormula(120) }),
      ),
    );
    const bottleIdx = formula.indexOf('data-section="bottle"');
    assert.ok(bottleIdx >= 0);
    const bottleChunk = formula.slice(
      bottleIdx,
      formula.indexOf('data-layout="home-row-nap-diaper"', bottleIdx),
    );
    assert.match(bottleChunk, /data-testid="baby-home-pending-recovery"/);
    assert.match(bottleChunk, /data-pending-owner="bottle"/);
    assert.match(bottleChunk, /Try again/);
    assert.match(bottleChunk, /Discard/);
    assert.match(bottleChunk, /could not confirm/i);
    assert.match(
      bottleChunk,
      /data-bottle-ml="120"[^>]*data-selected(?:="true")?/,
    );
    assert.equal(countRecovery(formula), 1);
    const statusIdx2 = formula.indexOf('data-testid="baby-home-status"');
    assert.doesNotMatch(formula.slice(statusIdx2), /Try again/);
    assert.doesNotMatch(
      formula.slice(statusIdx2),
      /baby-home-pending-recovery/,
    );

    // Pump amount unknown → under pump-amount; matching ml selected.
    const pumpAmt = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingUnknown({
            kind: "PUMP_AMOUNT",
            amountMl: 90,
          }),
        }),
      ),
    );
    const pumpAmtChunk = pumpAmt.slice(
      pumpAmt.indexOf('data-section="pump-amount"'),
      pumpAmt.indexOf('data-testid="baby-home-status"'),
    );
    assert.match(pumpAmtChunk, /data-pending-owner="pump_amount"/);
    assert.match(pumpAmtChunk, /Try again/);
    assert.match(
      pumpAmtChunk,
      /data-bottle-ml="90"[^>]*data-selected(?:="true")?/,
    );
    assert.equal(countRecovery(pumpAmt), 1);

    // Pump timed L orphaned sending → nested under pump_l only.
    const pumpL = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingSending({ kind: "BREAST", side: "pump_l" }),
          savingSeed: false,
        }),
      ),
    );
    assertRecoveryNestedInChip(
      pumpL,
      "baby-care-chip-pump_l",
      "pump_l",
      'data-testid="baby-care-chip-pump_r"',
    );
    assert.equal(countRecovery(pumpL), 1);

    // Diaper + nap unknown placement.
    const diaper = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingUnknown({
            kind: "DIAPER",
            diaperKind: "wet",
          }),
        }),
      ),
    );
    const diaperChunk = diaper.slice(
      diaper.indexOf('data-section="diaper"'),
      diaper.indexOf('data-testid="baby-home-status"'),
    );
    assert.match(diaperChunk, /data-pending-owner="diaper"/);
    assert.match(diaperChunk, /Try again/);
    assert.equal(countRecovery(diaper), 1);

    const nap = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingUnknown({ kind: "SLEEP" }),
        }),
      ),
    );
    assertRecoveryNestedInChip(
      nap,
      "baby-care-chip-nap",
      "nap",
      'data-section="diaper"',
    );
    assert.equal(countRecovery(nap), 1);

    // Ambiguous fail chrome: under-owner recovery without chainFailed status shout.
    const ambiguous = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingFormula(120),
          messageSeed: null,
        }),
      ),
    );
    assert.match(ambiguous, /data-pending-owner="bottle"/);
    const statusAmb = ambiguous.slice(
      ambiguous.indexOf('data-testid="baby-home-status"'),
      ambiguous.indexOf('data-testid="baby-home-status"') + 800,
    );
    // role=status may be empty/absent of failure shout when recovery is inline.
    assert.doesNotMatch(statusAmb, /Nothing was saved\. Try again/);
    assert.doesNotMatch(statusAmb, /Không lưu được gì/);

    // tooOld → Activities + Discard under owner; no Retry; no page strip.
    const tooOld = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: {
            ...pendingFormula(120),
            startedAt: now - BABY_QUICK_PENDING_RETRY_MAX_AGE_MS,
          },
        }),
      ),
    );
    const bottleTooOld = tooOld.slice(
      tooOld.indexOf('data-section="bottle"'),
      tooOld.indexOf('data-layout="home-row-nap-diaper"'),
    );
    assert.match(bottleTooOld, /data-testid="baby-home-pending-recovery"/);
    assert.doesNotMatch(bottleTooOld, /Try again/);
    assert.match(bottleTooOld, /Discard/);
    assert.match(bottleTooOld, /Open Activities/);
    assert.match(bottleTooOld, /href="\/baby\/activities"/);
    assert.match(bottleTooOld, /inline-flex/);
    assert.doesNotMatch(tooOld, /href="\/baby\/timeline"/);
    assert.equal(countRecovery(tooOld), 1);
    assert.doesNotMatch(
      tooOld.slice(tooOld.indexOf('data-testid="baby-home-status"')),
      /Open Activities/,
    );
  });

  it("no auto-retry on mount when pending exists (SSR shows under-owner recovery only)", () => {
    assert.equal(babyQuickShouldAutoRetryOnMount(), false);
    let invalidateCalls = 0;
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        ...homeProps({ pendingSeed: pendingFormula(120) }),
        onInvalidateCare: async () => {
          invalidateCalls += 1;
        },
      }),
    );
    assert.match(markup, /Try again/);
    assert.match(markup, /data-pending-owner="bottle"/);
    assert.equal(invalidateCalls, 0);
    assert.doesNotMatch(markup, /Saving/);
  });

  it("fail-closed saveBlocked markup", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: emptyStatus,
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        messageSeed: t("home.saveBlocked", "en"),
      }),
    );
    assert.match(markup, /Could not save safely on this device/);
    assert.match(markup, /role="status"/);
  });

  it("quiet success — no Saved diaper banner without error messageSeed", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: emptyStatus,
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
      }),
    );
    assert.doesNotMatch(markup, /Saved diaper/);
    assert.doesNotMatch(markup, /Saved breast/);
  });

  it("uses dayKey prop as data-day-key (query day is single source)", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: emptyStatus,
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        dayKey: "2026-09-12",
      }),
    );
    assert.match(markup, /data-day-key="2026-09-12"/);
  });
});

describe("BabyHome day roll wiring", () => {
  it("BabyHome attaches midnight roll with visibility/focus wake", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-home.tsx"),
      "utf8",
    );
    const contentStart = src.indexOf("export function BabyHomeContent");
    const homeStart = src.indexOf("export function BabyHome()");
    assert.ok(contentStart >= 0 && homeStart > contentStart);
    const contentSrc = src.slice(contentStart, homeStart);
    const homeSrc = src.slice(homeStart);
    assert.match(homeSrc, /attachBabyLocalDayRoll/);
    assert.match(homeSrc, /addVisibilityListener/);
    assert.match(homeSrc, /addFocusListener/);
    assert.match(homeSrc, /dayKey=\{day\.dayKey\}/);
    assert.doesNotMatch(contentSrc, /attachBabyLocalDayRoll/);
    assert.doesNotMatch(contentSrc, /msUntilNextLocalMidnight/);
    // Parent clock stays ≥30s; breast elapsed has its own 1s child.
    assert.match(
      contentSrc,
      /setInterval\(\(\) => setClock\(Date\.now\(\)\), 30_000\)/,
    );
    assert.match(contentSrc, /BabyBreastElapsedText/);
  });
});
