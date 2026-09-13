import assert from "node:assert/strict";
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
    assert.match(src, /BabyBottleMlChips/);
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

  it("soft-invalidates after confirmed save so refetch cannot chainFailed", async () => {
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
    const chainFailedIdx = body.indexOf('t("home.chainFailed")');
    assert.ok(softIdx >= 0 && catchIdx > softIdx);
    assert.ok(chainFailedIdx > catchIdx);
  });

  it("renders sections in locked order breast → bottle → nap → diaper", () => {
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
    const status = markup.indexOf('data-testid="baby-home-status"');
    const row = markup.indexOf('data-layout="home-row-bottle-nap-diaper"');
    assert.ok(breast >= 0 && bottle > breast && nap > bottle && diaper > nap);
    assert.ok(status > diaper);
    // Bottle / nap / diaper share one auto-fit row on wide containers.
    assert.ok(row > breast && row < bottle, "row wraps bottle→nap→diaper");
    assert.ok(bottle > row && nap > bottle && diaper > nap);
    assert.match(markup, /data-testid="baby-home-header-breast"/);
    assert.match(markup, /data-testid="baby-home-header-bottle"/);
    assert.match(markup, /data-testid="baby-home-header-nap"/);
    assert.match(markup, /data-testid="baby-home-header-diaper"/);
    assert.match(
      markup,
      /<h2[^>]*id="baby-home-heading-breast"[^>]*>[\s\S]*Breast[\s\S]*<\/h2>/,
    );
    assert.match(
      markup,
      /<h2[^>]*id="baby-home-heading-bottle"[^>]*>[\s\S]*Bottle[\s\S]*<\/h2>/,
    );
    assert.match(
      markup,
      /<h2[^>]*id="baby-home-heading-nap"[^>]*>[\s\S]*Nap[\s\S]*<\/h2>/,
    );
    assert.match(
      markup,
      /<h2[^>]*id="baby-home-heading-diaper"[^>]*>[\s\S]*Diaper[\s\S]*<\/h2>/,
    );
    assert.match(markup, /data-layout="bottle-ml-chips"[^>]*grid-cols-2/);
    assert.match(markup, /Last feed was/);
    assert.match(markup, /about 10 minutes ago/);
    // Progress lives on bottle header, not feed status
    const bottleHdr = markup.slice(
      markup.indexOf('data-testid="baby-home-header-bottle"'),
      markup.indexOf("</header>", markup.indexOf('data-testid="baby-home-header-bottle"')) +
        "</header>".length,
    );
    assert.match(bottleHdr, /Today/);
    assert.match(bottleHdr, />3</);
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

  it("breast Done flash after stop; nap Done flash after SLEEP", () => {
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

    const napMarkup = renderToStaticMarkup(
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
    const napStart = napMarkup.indexOf('data-section="nap"');
    assert.ok(napStart >= 0);
    const nap = napMarkup.slice(napStart, napStart + 2000);
    assert.match(nap, /data-done-flash/);
    assert.match(nap, />Done</);
  });

  it("breast/diaper tips: empty fallbacks, next-due, and overdue", () => {
    const emptyTips = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: { ...emptyStatus, birthDate: null },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
      }),
    );
    const breastEmpty = emptyTips.slice(
      emptyTips.indexOf('data-testid="baby-home-header-breast"'),
      emptyTips.indexOf('data-section="bottle"'),
    );
    const diaperHdrStart = emptyTips.indexOf(
      'data-testid="baby-home-header-diaper"',
    );
    const diaperEmpty = emptyTips.slice(
      diaperHdrStart,
      emptyTips.indexOf("</header>", diaperHdrStart) + "</header>".length,
    );
    assert.match(breastEmpty, /Tap/);
    assert.match(breastEmpty, /Left/);
    assert.match(breastEmpty, /Right/);
    assert.match(diaperEmpty, /kind/);
    assert.match(breastEmpty, /font-medium text-foreground tabular-nums/);
    assert.doesNotMatch(breastEmpty, / · /);
    assert.equal(
      (breastEmpty.match(/<h2\b/g) ?? []).length,
      1,
      "breast label is one heading",
    );
    assert.equal(
      (diaperEmpty.match(/<h2\b/g) ?? []).length,
      1,
      "diaper label is one heading",
    );

    const clock = new Date("2026-02-15T12:00:00.000Z").getTime();
    const nextDue = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          lastFeed: {
            id: "f1",
            at: new Date(clock - 30 * 60_000).toISOString(),
            endedAt: null,
            payload: { method: "breast_l" },
            summary: "Feed (Breast L)",
          },
          lastDiaper: {
            id: "d1",
            at: new Date(clock - 30 * 60_000).toISOString(),
            endedAt: null,
            payload: { kind: "wet" },
            summary: "Diaper (Wet)",
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
    const breastNext = nextDue.slice(
      nextDue.indexOf('data-testid="baby-home-header-breast"'),
      nextDue.indexOf('data-section="bottle"'),
    );
    const diaperNext = nextDue.slice(
      nextDue.indexOf('data-testid="baby-home-header-diaper"'),
    );
    assert.match(breastNext, /Next feed is in about/i);
    assert.match(diaperNext, /Next change is in about/i);

    const overdue = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          lastFeed: {
            id: "f1",
            at: new Date(clock - 5 * 60 * 60_000).toISOString(),
            endedAt: null,
            payload: { method: "breast_l" },
            summary: "Feed (Breast L)",
          },
          lastDiaper: {
            id: "d1",
            at: new Date(clock - 5 * 60 * 60_000).toISOString(),
            endedAt: null,
            payload: { kind: "wet" },
            summary: "Diaper (Wet)",
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
    const breastOver = overdue.slice(
      overdue.indexOf('data-testid="baby-home-header-breast"'),
      overdue.indexOf('data-section="bottle"'),
    );
    const diaperOver = overdue.slice(
      overdue.indexOf('data-testid="baby-home-header-diaper"'),
    );
    assert.match(breastOver, /overdue/i);
    assert.match(diaperOver, /overdue/i);
  });

  it("bottle header shows recommended ml and 0/N; nap blend when birth set", () => {
    // birth 2026-01-01 → ~45d (1–3mo band). Weight 4.2 → ~90 ml; mid-band without weight is ~120.
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2026-01-01",
          feedsToday: 0,
          latestWeightKg: 4.2,
        },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: new Date("2026-02-15T12:00:00").getTime(),
      }),
    );
    assert.match(markup, /data-testid="baby-home-header-bottle"/);
    const bottleHeader = markup.slice(
      markup.indexOf('data-testid="baby-home-header-bottle"'),
      markup.indexOf('data-section="nap"'),
    );
    assert.match(bottleHeader, /Today/);
    assert.match(bottleHeader, /0/);
    assert.match(bottleHeader, /About/);
    assert.match(bottleHeader, /90 ml/);
    assert.match(bottleHeader, /font-medium text-foreground tabular-nums/);
    assert.doesNotMatch(bottleHeader, /~120 ml/);
    assert.doesNotMatch(bottleHeader, /recommend/);
    assert.match(markup, /data-testid="baby-home-header-nap"/);
    assert.match(markup, /At this age, about/);
    assert.match(markup, /15–16 hours/);
    assert.match(
      markup,
      /Guidelines only — watch wet diapers and weight gain\./,
    );
  });

  it("past 3y still shows toddler nap blend on home", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          ...emptyStatus,
          birthDate: "2020-01-01",
          feedsToday: 0,
        },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: new Date("2026-02-15T12:00:00").getTime(),
      }),
    );
    const napHeader = markup.slice(
      markup.indexOf('data-testid="baby-home-header-nap"'),
      markup.indexOf('data-section="diaper"'),
    );
    assert.match(napHeader, /At this age, about/);
    assert.match(napHeader, /12–13 hours/);
    assert.match(napHeader, /1 nap/);
    assert.doesNotMatch(napHeader, /recommend/);
  });

  it("no-birth: bottle header action sentence; nap has no sleep blend; chips still render", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: { ...emptyStatus, birthDate: null, recentBottleMl: [] },
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
      }),
    );
    const bottleHeader = markup.slice(
      markup.indexOf('data-testid="baby-home-header-bottle"'),
      markup.indexOf(
        "</header>",
        markup.indexOf('data-testid="baby-home-header-bottle"'),
      ) + "</header>".length,
    );
    assert.match(bottleHeader, /Bottle/);
    assert.match(bottleHeader, /Pick an/);
    assert.match(bottleHeader, /amount/);
    assert.doesNotMatch(bottleHeader, /Today/);
    assert.doesNotMatch(bottleHeader, /\d+ ml/);
    const napHeader = markup.slice(
      markup.indexOf('data-testid="baby-home-header-nap"'),
      markup.indexOf(
        "</header>",
        markup.indexOf('data-testid="baby-home-header-nap"'),
      ) + "</header>".length,
    );
    assert.doesNotMatch(napHeader, /recommend/);
    assert.doesNotMatch(napHeader, /16–18 hours/);
    assert.match(napHeader, /start/);
    assert.match(markup, /data-bottle-ml="60"/);
    assert.match(markup, /data-bottle-ml="90"/);
    assert.match(markup, /data-bottle-ml="120"/);
    assert.match(markup, /data-testid="baby-birth-date-prompt"/);
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

  it("pending bar: none / retryable / tooOld markup", () => {
    const none = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: emptyStatus,
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        pendingSeed: null,
      }),
    );
    assert.doesNotMatch(none, /Try again/);
    assert.doesNotMatch(none, /could not confirm/i);

    const retryable = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: emptyStatus,
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        pendingSeed: pendingFormula(120),
      }),
    );
    assert.match(retryable, /Try again/);
    assert.match(retryable, /could not confirm/i);
    assert.match(retryable, /Discard/);

    const tooOld = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: emptyStatus,
        statusLoading: false,
        statusError: false,
        onRetryStatus: () => {},
        babyId: "b1",
        t: (key) => t(key as never, "en"),
        locale: "en",
        nowMs: now,
        pendingSeed: {
          ...pendingFormula(120),
          startedAt: now - BABY_QUICK_PENDING_RETRY_MAX_AGE_MS,
        },
      }),
    );
    assert.doesNotMatch(tooOld, /Try again/);
    assert.match(tooOld, /Discard/);
    assert.match(tooOld, /Open the timeline/);
  });

  it("no auto-retry on mount when pending exists (SSR shows bar only)", () => {
    assert.equal(babyQuickShouldAutoRetryOnMount(), false);
    let invalidateCalls = 0;
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
        pendingSeed: pendingFormula(120),
        onInvalidateCare: async () => {
          invalidateCalls += 1;
        },
      }),
    );
    assert.match(markup, /Try again/);
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
