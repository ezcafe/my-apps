import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyHomeContent } from "@/components/baby-home";
import { babyAgeInDays, babyFeedGuideForAge } from "@/lib/baby-age-guide";
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

/** Recovery must sit in the section footer (not under a single chip). */
function assertRecoveryInSectionFooter(
  markup: string,
  section: "breast" | "bottle" | "nap" | "diaper" | "pump",
  owner: string,
) {
  const sectionIdx = markup.indexOf(`data-section="${section}"`);
  assert.ok(sectionIdx >= 0, `missing section ${section}`);
  const footerIdx = markup.indexOf(`data-section-footer="${section}"`, sectionIdx);
  assert.ok(footerIdx > sectionIdx, `missing footer for ${section}`);
  const chunk = markup.slice(footerIdx, footerIdx + 1200);
  assert.match(
    chunk,
    new RegExp(
      `data-testid="baby-home-pending-recovery"[^>]*data-pending-owner="${owner}"`,
    ),
  );
  assert.match(chunk, /Try again|Open Activities/);
  assert.match(chunk, /aria-live="polite"|role="status"/);
  assert.match(chunk, /min-h-11/);
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
    const guidelinesIdx = markup.indexOf('data-testid="baby-care-guidelines"', statusIdx);
    const end = guidelinesIdx >= 0 ? guidelinesIdx : markup.length;
    const statusChunk = markup.slice(statusIdx, end);
    assert.match(statusChunk, /No feed logged yet/);
    assert.doesNotMatch(statusChunk, /2 today/);
    assert.doesNotMatch(statusChunk, /\d+\/\d+/);
  });

  it("keeps customSelected during flash window after Custom-origin success", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-home.tsx"),
      "utf8",
    );
    assert.match(src, /babyHomeKeepFromCustomAfterAmountSuccess/);
    assert.match(src, /resolveBabyHomeCustomSelected/);
    assert.match(src, /customSelected=\{bottleCustomSelected\}/);
    assert.match(src, /customSelected=\{pumpCustomSelected\}/);
    assert.doesNotMatch(src, /customSelected=\{false\}/);
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
    const onConfirmStart = src.indexOf("onConfirm={({ ml, iso }) => {");
    assert.ok(onConfirmStart >= 0, "Custom onConfirm handler");
    const onConfirmEnd = src.indexOf("}", onConfirmStart);
    const onConfirmBody = src.slice(onConfirmStart, onConfirmEnd);
    assert.doesNotMatch(
      onConfirmBody,
      /runQuick/,
      "confirm sets ml + time — chip tap saves",
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

  it("captures formula/pump fromCustom at runQuick call time (before await)", async () => {
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
    const awaitIdx = body.indexOf("await ");
    assert.ok(awaitIdx >= 0);
    const beforeAwait = body.slice(0, awaitIdx);
    assert.match(
      beforeAwait,
      /const formulaFromCustomAtCall\s*=\s*formulaFromCustom/,
    );
    assert.match(
      beforeAwait,
      /const pumpAmountFromCustomAtCall\s*=\s*pumpAmountFromCustom/,
    );
    assert.match(
      body,
      /fromCustom:\s*formulaFromCustomAtCall/,
    );
    assert.match(
      body,
      /fromCustom:\s*pumpAmountFromCustomAtCall/,
    );
    assert.doesNotMatch(
      body,
      /fromCustom:\s*formulaFromCustom\s*[,}]/,
      "FORMULA keepFromCustom must not re-read live formulaFromCustom after await",
    );
    assert.doesNotMatch(
      body,
      /fromCustom:\s*pumpAmountFromCustom\s*[,}]/,
      "PUMP_AMOUNT keepFromCustom must not re-read live pumpAmountFromCustom after await",
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
    assert.match(markup, /data-layout="home-row-nap"/);
    assert.match(markup, /data-layout="home-row-diaper"/);
    assert.match(markup, /data-layout="home-row-pump"/);
    // Nap/Diaper: fixed 2 cols (auto-fit + col-span-full footer blocks stretch).
    const napRow = markup.slice(
      markup.indexOf('data-layout="home-row-nap"'),
      markup.indexOf('data-layout="home-row-diaper"'),
    );
    assert.match(napRow, /repeat\(2, minmax\(0, 1fr\)\)/);
    const diaperRow = markup.slice(
      markup.indexOf('data-layout="home-row-diaper"'),
      markup.indexOf('data-layout="home-row-pump"'),
    );
    assert.match(diaperRow, /repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(markup, /data-testid="baby-home-header-pump"/);
    assert.match(markup, /data-testid="baby-care-chip-pump_l"/);
    assert.match(markup, /data-testid="baby-care-chip-pump_r"/);
    assert.match(markup, /data-testid="baby-care-chip-pump_both"/);
    assert.match(markup, /data-testid="baby-care-chip-nap"/);
    assert.match(markup, /data-testid="baby-care-chip-nap-custom-time"/);
    assert.match(markup, /data-testid="baby-care-chip-diaper-custom-time"/);
    assert.match(markup, />Custom nap</);
    assert.match(markup, />Custom diaper</);
    assert.match(markup, />Both</);
    assert.match(markup, /data-custom-time-chip/);
    // Custom columns keep empty header slot — no "Custom time" section headings.
    assert.doesNotMatch(markup, /data-testid="baby-home-header-nap-custom"/);
    assert.doesNotMatch(markup, /data-testid="baby-home-header-diaper-custom"/);
    assert.match(
      markup,
      /data-section="nap-custom-time"[^]*?data-header-slot="empty"/,
    );
    assert.match(
      markup,
      /data-section="diaper-custom-time"[^]*?data-header-slot="empty"/,
    );
    // Pump sides nested in 12rem section — not equal 3-col asContents with amount.
    const homeSrc = readFileSync(
      resolve(process.cwd(), "components/baby-home.tsx"),
      "utf8",
    );
    assert.doesNotMatch(
      homeSrc.slice(homeSrc.indexOf('data-layout="home-row-pump"')),
      /asContents/,
    );
    assert.match(
      markup,
      /data-section="pump-amount"[^]*?min-h-\[calc\(2\*2\.75rem\+3px\)\]/,
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
      /data-testid="baby-care-chip-breast_l"[^]*?data-face-slot="done"[^>]*>Done</,
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

  it("age footers + no under-chip helpers; guidelines + pump chips present", () => {
    const clock = new Date("2026-09-12T12:00:00.000Z").getTime();
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: { ...emptyStatus, birthDate: "2026-01-01", feedsToday: 0 },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: clock,
      }),
    );
    assert.match(markup, /data-testid="baby-home-header-breast"/);
    assert.match(markup, /data-testid="baby-home-header-bottle"/);
    assert.match(markup, /data-testid="baby-home-header-nap"/);
    assert.match(markup, /data-testid="baby-home-header-diaper"/);
    assert.match(markup, /data-testid="baby-home-header-pump"/);
    assert.doesNotMatch(markup, /Session side/);
    assert.doesNotMatch(markup, /Start or end nap/);
    assert.doesNotMatch(markup, /Pick a kind/);
    assert.doesNotMatch(markup, /Timed side/);
    // Bottle progress in footer, not header
    const bottleHeader = markup.slice(
      markup.indexOf('data-testid="baby-home-header-bottle"'),
      markup.indexOf('data-layout="bottle-ml-chips"'),
    );
    assert.doesNotMatch(bottleHeader, /Today/);
    const bottleFooter = markup.slice(
      markup.indexOf('data-section-footer="bottle"'),
      markup.indexOf('data-layout="home-row-nap"'),
    );
    assert.match(bottleFooter, /Today/);
    assert.match(markup, /data-section-footer="breast"/);
    const breastFooter = markup.slice(
      markup.indexOf('data-section-footer="breast"'),
      markup.indexOf('data-section-footer="bottle"'),
    );
    const ageDays = babyAgeInDays("2026-01-01", new Date(clock))!;
    const band = babyFeedGuideForAge(ageDays);
    // Marked «min»/«max» render as strong numbers in the footer.
    assert.match(
      breastFooter,
      new RegExp(
        `>${band.feedsMin}<[\\s\\S]*–[\\s\\S]*>${band.feedsMax}<[\\s\\S]*feeds a day`,
      ),
    );
    assert.match(markup, /data-testid="baby-care-guidelines"/);
    assert.match(markup, /data-guide-mode="full"/);
    assert.doesNotMatch(markup, /baby-guideline-feed/);
    assert.match(markup, /data-guide-section-collapsed/);
    assert.match(markup, /data-guide-stage-collapsed/);
    assert.doesNotMatch(markup, /data-guide-block="section-i"[^>]*\sopen[\s>]/);
    assert.doesNotMatch(markup, /data-guide-block="section-ii"[^>]*\sopen[\s>]/);
    assert.doesNotMatch(markup, /data-guide-stage="[^"]+"[^>]*\sopen[\s>]/);
    assert.match(
      markup,
      /This information is for reference only\. For medical advice or diagnosis/,
    );
    assert.match(markup, /Room Temperature|Newborn Stage/i);
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

    // Orphaned sending after remount (!saving) → recovery in breast section footer.
    const orphaned = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingBreastSending(),
          savingSeed: false,
        }),
      ),
    );
    assertRecoveryInSectionFooter(orphaned, "breast", "breast_l");
    const rightIdx = orphaned.indexOf('data-testid="baby-care-chip-breast_r"');
    const rightChunk = orphaned.slice(
      rightIdx,
      orphaned.indexOf('data-section-footer="breast"', rightIdx),
    );
    assert.doesNotMatch(rightChunk, /baby-home-pending-recovery/);
    assert.equal(countRecovery(orphaned), 1);
    // Durable page-strip contract: status region has no failure title / recovery.
    const afterStatus = orphaned.slice(
      orphaned.indexOf('data-testid="baby-home-status"'),
    );
    assert.doesNotMatch(afterStatus, /could not confirm/i);
    assert.doesNotMatch(afterStatus, /Try again/);
    assert.doesNotMatch(afterStatus, /baby-home-pending-recovery/);

    // Unknown FORMULA → recovery under bottle footer; matching ml chip selected.
    const formula = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({ pendingSeed: pendingFormula(120) }),
      ),
    );
    assertRecoveryInSectionFooter(formula, "bottle", "bottle");
    const bottleIdx = formula.indexOf('data-section="bottle"');
    assert.ok(bottleIdx >= 0);
    const bottleChunk = formula.slice(
      bottleIdx,
      formula.indexOf('data-layout="home-row-nap"', bottleIdx),
    );
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

    // Pump amount unknown → pump section footer; matching ml selected.
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
    assertRecoveryInSectionFooter(pumpAmt, "pump", "pump_amount");
    const pumpAmtChunk = pumpAmt.slice(
      pumpAmt.indexOf('data-section="pump"'),
      pumpAmt.indexOf('data-testid="baby-home-status"'),
    );
    assert.match(pumpAmtChunk, /Try again/);
    assert.match(
      pumpAmtChunk,
      /data-bottle-ml="90"[^>]*data-selected(?:="true")?/,
    );
    assert.equal(countRecovery(pumpAmt), 1);
    // Age tip suppressed while recovery shows (footer only — not guidelines).
    const pumpFooterOnly = pumpAmt.slice(
      pumpAmt.indexOf('data-section-footer="pump"'),
      pumpAmt.indexOf('data-testid="baby-home-status"'),
    );
    assert.doesNotMatch(
      pumpFooterOnly,
      /ml\/session|times\/day|Pump about/,
    );

    // Diaper unknown → shared col-span footer (same line as section tip row).
    const diaperRec = renderToStaticMarkup(
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
    assertRecoveryInSectionFooter(diaperRec, "diaper", "diaper");
    const diaperFooter = diaperRec.slice(
      diaperRec.indexOf('data-section-footer="diaper"'),
      diaperRec.indexOf('data-layout="home-row-pump"'),
    );
    assert.match(diaperFooter, /col-span-full/);
    assert.match(diaperFooter, /flex flex-nowrap/);
    assert.match(diaperFooter, /could not confirm/i);
    assert.equal(countRecovery(diaperRec), 1);

    // Pump timed L orphaned sending → pump section footer.
    const pumpL = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingSending({ kind: "BREAST", side: "pump_l" }),
          savingSeed: false,
        }),
      ),
    );
    assertRecoveryInSectionFooter(pumpL, "pump", "pump_l");
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
    assertRecoveryInSectionFooter(diaper, "diaper", "diaper");
    assert.equal(countRecovery(diaper), 1);

    const nap = renderToStaticMarkup(
      createElement(
        BabyHomeContent,
        homeProps({
          pendingSeed: pendingUnknown({ kind: "SLEEP" }),
        }),
      ),
    );
    assertRecoveryInSectionFooter(nap, "nap", "nap");
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

    // tooOld → Activities + Discard under section footer; no Retry; no page strip.
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
      tooOld.indexOf('data-layout="home-row-nap"'),
    );
    assert.match(bottleTooOld, /data-testid="baby-home-pending-recovery"/);
    assert.doesNotMatch(bottleTooOld, /Try again/);
    assert.match(bottleTooOld, /Discard/);
    assert.match(bottleTooOld, /Open Activities/);
    assert.match(bottleTooOld, /href="\/baby\/activities"/);
    assert.match(bottleTooOld, /flex flex-nowrap/);
    assert.match(bottleTooOld, /min-h-11/);
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

  it("nap header uses sleep next-due; chip subtitle is blank (not next/overdue)", () => {
    const clock = new Date("2026-09-12T12:00:00.000Z").getTime();
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          lastSleep: {
            id: "s1",
            at: new Date(clock - 30 * 60_000).toISOString(),
            endedAt: new Date(clock - 30 * 60_000).toISOString(),
            payload: null,
            summary: "Nap",
          },
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
    const header = markup.slice(
      markup.indexOf('data-testid="baby-home-header-nap"'),
      markup.indexOf('data-testid="baby-care-chip-nap"'),
    );
    assert.match(header, /Next nap|overdue|Tap to/i);
    const chip = markup.slice(
      markup.indexOf('data-testid="baby-care-chip-nap"'),
      markup.indexOf('data-section-footer="nap"'),
    );
    assert.doesNotMatch(chip, /Next nap|overdue/i);
    const footer = markup.slice(
      markup.indexOf('data-section-footer="nap"'),
      markup.indexOf('data-section="diaper"'),
    );
    assert.match(footer, /hours|naps/i);
  });

  it("bottle with birth band → lead-only header; without band → empty/pick body", () => {
    const withBand = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        ...homeProps(),
        status: { ...emptyStatus, birthDate: "2026-01-01", feedsToday: 2 },
        nowMs: new Date("2026-09-12T12:00:00.000Z").getTime(),
      }),
    );
    const bandHeader = withBand.slice(
      withBand.indexOf('data-testid="baby-home-header-bottle"'),
      withBand.indexOf('data-layout="bottle-ml-chips"'),
    );
    assert.doesNotMatch(bandHeader, /Today|About «|Pick an/);
    assert.match(
      withBand.slice(withBand.indexOf('data-section-footer="bottle"')),
      /Today/,
    );

    const noBand = renderToStaticMarkup(
      createElement(BabyHomeContent, homeProps()),
    );
    const noBandHeader = noBand.slice(
      noBand.indexOf('data-testid="baby-home-header-bottle"'),
      noBand.indexOf('data-layout="bottle-ml-chips"'),
    );
    assert.match(noBandHeader, /Pick an/);
  });

  it("pump heading is lead only (no empty tip body)", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, homeProps()),
    );
    const header = markup.slice(
      markup.indexOf('data-testid="baby-home-header-pump"'),
      markup.indexOf('data-testid="baby-care-chip-pump_l"'),
    );
    assert.match(header, /Pump/);
    assert.doesNotMatch(header, /Tap|amount|start/i);
  });

  it("diaper and pump footers stay empty when birth age unknown", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, homeProps()),
    );
    const diaperFooter = markup.slice(
      markup.indexOf('data-section-footer="diaper"'),
      markup.indexOf('data-section="pump"'),
    );
    const pumpFooter = markup.slice(
      markup.indexOf('data-section-footer="pump"'),
      markup.indexOf('data-testid="baby-home-status"'),
    );
    assert.doesNotMatch(diaperFooter, /Change about|Tape diapers|Pants/);
    assert.doesNotMatch(pumpFooter, /Pump about|ml\/session|times\/day/);
  });

  it("diaper/pump footer stage key matches ageDays (day 0 → newborn)", () => {
    const clock = new Date("2026-01-01T12:00:00.000Z").getTime();
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        ...homeProps(),
        status: { ...emptyStatus, birthDate: "2026-01-01" },
        nowMs: clock,
      }),
    );
    assert.match(
      markup.slice(markup.indexOf('data-section-footer="diaper"')),
      /Change about every 2–3 hours/,
    );
    assert.match(
      markup.slice(markup.indexOf('data-section-footer="pump"')),
      /Pump about every 2–3 hours/,
    );
  });

  it("nap status-fail keeps fixed shell; fail copy lives in footer", () => {
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
    assert.match(markup, /data-nap-shell="fail"/);
    assert.match(markup, /h-\[calc\(2\*2\.75rem\+3px\)\]/);
    const chip = markup.slice(
      markup.indexOf('data-testid="baby-care-chip-nap"'),
      markup.indexOf('data-section-footer="nap"'),
    );
    assert.doesNotMatch(chip, /Could not check nap status/);
    const footer = markup.slice(
      markup.indexOf('data-section-footer="nap"'),
      markup.indexOf('data-section="diaper"'),
    );
    assert.match(footer, /Could not check nap status/);
    assert.match(footer, /Retry/);
    assert.match(footer, /aria-live="polite"|role="status"/);
  });

  it("nap pending recovery wins over status-check fail in footer", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: null,
        statusLoading: false,
        statusError: true,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        pendingSeed: pendingUnknown({ kind: "SLEEP" }),
      }),
    );
    const footer = markup.slice(
      markup.indexOf('data-section-footer="nap"'),
      markup.indexOf('data-section="diaper"'),
    );
    assert.match(footer, /data-pending-owner="nap"/);
    assert.match(footer, /Try again/);
    assert.doesNotMatch(footer, /Could not check nap status/);
    assert.doesNotMatch(footer, /hours of sleep|naps/);
  });

  it("birthday modal opens when status ready + unset; no strip; closed on error/loading", () => {
    const open = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        ...homeProps(),
        visitDismissedSeed: false,
      }),
    );
    assert.match(open, /data-birth-date-modal="open"/);
    assert.doesNotMatch(open, /baby-birth-date-prompt/);
    assert.doesNotMatch(open, /Add a birthday for age-based/);

    const errored = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: null,
        statusLoading: false,
        statusError: true,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        visitDismissedSeed: false,
      }),
    );
    assert.match(errored, /data-birth-date-modal="closed"/);

    const loading = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: null,
        statusLoading: true,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        visitDismissedSeed: false,
      }),
    );
    assert.match(loading, /data-birth-date-modal="closed"/);

    const dismissed = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        ...homeProps(),
        visitDismissedSeed: true,
      }),
    );
    assert.match(dismissed, /data-birth-date-modal="closed"/);
    assert.match(dismissed, /data-testid="baby-home"/);
  });

  it("status Row 4 includes mapped care icons", () => {
    const breastFeed = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        ...homeProps(),
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          lastFeed: {
            id: "f1",
            at: new Date(now - 60_000).toISOString(),
            endedAt: null,
            payload: { method: "breast_l" },
            summary: "Feed",
          },
        },
      }),
    );
    const statusBreast = breastFeed.slice(
      breastFeed.indexOf('data-testid="baby-home-status"'),
      breastFeed.indexOf('data-testid="baby-care-guidelines"'),
    );
    assert.match(statusBreast, /aria-hidden/);
    assert.ok(
      (statusBreast.match(/size-5 shrink-0/g) ?? []).length >= 4,
      "expected ≥4 status icons",
    );
    // Breast last feed → breast glyph path (not bottle)
    assert.match(statusBreast, /M12 4c/);
    assert.doesNotMatch(statusBreast, /M9 3h6/);

    const emptyFeed = renderToStaticMarkup(
      createElement(BabyHomeContent, homeProps()),
    );
    const statusEmpty = emptyFeed.slice(
      emptyFeed.indexOf('data-testid="baby-home-status"'),
      emptyFeed.indexOf('data-testid="baby-care-guidelines"'),
    );
    // Empty / unknown feed → bottle glyph path
    assert.match(statusEmpty, /M9 3h6/);
    assert.doesNotMatch(statusEmpty, /M12 4c/);
  });
});

describe("home.titleWithAge i18n (Decision 7 Option 2)", () => {
  it("EN/VI full-word months templates exist", () => {
    assert.equal(t("home.titleWithAge", "en"), "Baby Care · {n} months");
    assert.equal(t("home.titleWithAge", "vi"), "Chăm bé · {n} tháng");
  });

  it("EN/VI day templates for under-1-month header", () => {
    assert.equal(t("home.titleWithAgeDay", "en"), "Baby Care · {n} day");
    assert.equal(t("home.titleWithAgeDay", "vi"), "Chăm bé · {n} ngày");
    assert.equal(t("home.titleWithAgeDays", "en"), "Baby Care · {n} days");
    assert.equal(t("home.titleWithAgeDays", "vi"), "Chăm bé · {n} ngày");
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
