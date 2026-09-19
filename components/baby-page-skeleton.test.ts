import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BabyActivitiesPageSkeleton,
  BabyDiaperSkeleton,
  BabyFeedSkeleton,
  BabyHomeSkeleton,
  BabyPumpSkeleton,
  BabySleepSkeleton,
} from "@/components/baby-page-skeleton";

describe("BabyHomeSkeleton section headers + chips parity", () => {
  it("uses locked row order breast+bottle → nap+diaper → pump → status → guidelines", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    const breast = html.indexOf('data-skeleton="section-breast"');
    const bottle = html.indexOf('data-skeleton="section-bottle"');
    const nap = html.indexOf('data-skeleton="section-nap"');
    const diaper = html.indexOf('data-skeleton="section-diaper"');
    const pump = html.indexOf('data-skeleton="section-pump"');
    const status = html.indexOf('data-skeleton="home-status"');
    const guidelines = html.indexOf('data-skeleton="home-row-guidelines"');
    assert.ok(breast >= 0 && bottle > breast);
    assert.ok(nap > bottle && diaper > nap);
    assert.ok(pump > diaper && status > pump && guidelines > status);
    assert.match(html, /data-skeleton="section-pump-header"/);
    assert.equal(
      (html.match(/data-skeleton="guideline-header"/g) ?? []).length,
      4,
    );
  });

  it("mirrors flush bottle chips + Custom and flush 2×2 Kind", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));

    assert.match(html, /data-skeleton="bottle-ml-chips"/);
    assert.match(html, /data-skeleton="diaper-kind-2x2"/);
    assert.match(html, /data-skeleton="pump-amount-ml-chips"/);
    assert.doesNotMatch(html, /data-skeleton="b1-bottle"/);

    const chipsIdx = html.indexOf('data-skeleton="bottle-ml-chips"');
    const chipsChunk = html.slice(chipsIdx, chipsIdx + 700);
    assert.match(chipsChunk, /gap-0/);
    assert.match(chipsChunk, /grid-cols-2/);
    assert.match(chipsChunk, /grid-rows-2/);
    assert.match(chipsChunk, /data-skeleton="custom-ml"/);
    assert.equal((chipsChunk.match(/min-h-11/g) ?? []).length >= 4, true);

    const kindIdx = html.indexOf('data-skeleton="diaper-kind-2x2"');
    const kindChunk = html.slice(kindIdx, kindIdx + 600);
    assert.match(kindChunk, /grid-cols-2/);
    assert.match(kindChunk, /grid-rows-2/);
    assert.match(kindChunk, /gap-0/);
    assert.equal((kindChunk.match(/min-h-11/g) ?? []).length, 4);
  });

  it("status before guidelines at bottom (no guide caveat)", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    const guidelinesIdx = html.indexOf('data-skeleton="home-row-guidelines"');
    const caveatIdx = html.indexOf('data-skeleton="guide-caveat"');
    const statusIdx = html.indexOf('data-skeleton="home-status"');
    assert.ok(guidelinesIdx >= 0, "guidelines present");
    assert.equal(caveatIdx, -1, "guide caveat removed");
    assert.ok(statusIdx >= 0 && guidelinesIdx > statusIdx, "guidelines after status");
  });

  it("uses concentric radii tokens (outer md, nested sm)", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    assert.match(html, /rounded-\[var\(--radius-md\)\]/);
    assert.match(html, /rounded-\[var\(--radius-sm\)\]/);
    const bottleChips = html.slice(
      html.indexOf('data-skeleton="bottle-ml-chips"'),
      html.indexOf('data-skeleton="home-row-nap-diaper"'),
    );
    assert.match(bottleChips, /rounded-\[var\(--radius-md\)\]/);
    const kind = html.slice(
      html.indexOf('data-skeleton="diaper-kind-2x2"'),
      html.indexOf('data-skeleton="home-row-pump"'),
    );
    assert.match(kind, /rounded-\[var\(--radius-md\)\]/);
  });
});

describe("BabyActivitiesPageSkeleton", () => {
  it("uses locked order filters → period → ledger", () => {
    const html = renderToStaticMarkup(
      createElement(BabyActivitiesPageSkeleton),
    );
    const filters = html.indexOf('data-skeleton="activities-filters"');
    const period = html.indexOf('data-skeleton="activities-period"');
    const ledger = html.indexOf('data-skeleton="activities-ledger"');
    assert.ok(filters >= 0 && period > filters && ledger > period);
  });
});

describe("BabyActivitiesPage live chrome order", () => {
  it("uses locked testid order filters → period → ledger", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-activities-page.tsx"),
      "utf8",
    );
    const filters = src.indexOf('data-testid="baby-activities-filters"');
    const period = src.indexOf('data-testid="baby-activities-period"');
    const ledger = src.indexOf('data-testid="baby-activities-ledger"');
    assert.ok(filters >= 0 && period > filters && ledger > period);
  });

  it("keeps hooks above skeleton early-return (Rules of Hooks)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-activities-page.tsx"),
      "utf8",
    );
    const skeletonReturn = src.indexOf(
      "if (showInitialSkeleton) {\n    return <BabyActivitiesPageSkeleton />;",
    );
    assert.ok(skeletonReturn >= 0, "skeleton early-return present");
    const after = src.slice(skeletonReturn);
    assert.doesNotMatch(
      after,
      /\buse(Callback|Effect|Memo|State|Transition|Ref)\b/,
      "no hooks after skeleton early-return",
    );
    const retry = src.indexOf("handleRetryLoad");
    assert.ok(retry >= 0 && retry < skeletonReturn, "retry hook before return");
  });
});

describe("feed / diaper / sleep skeleton chrome parity", () => {
  it("BabyFeedSkeleton: L/R + formula ml in one grid like Pump", () => {
    const html = renderToStaticMarkup(createElement(BabyFeedSkeleton));
    const timerIdx = html.indexOf('data-skeleton="feed-timer-chips"');
    const formulaIdx = html.indexOf('data-skeleton="feed-formula-ml-chips"');
    assert.ok(timerIdx >= 0 && formulaIdx > timerIdx);
    assert.match(html, /items-stretch[^>]*data-skeleton="feed-timer-chips"/);
    // Formula chips live inside the same timer grid row (Pump parity).
    const row = html.slice(Math.max(0, timerIdx - 120), formulaIdx + 500);
    assert.equal((row.match(/min-h-14/g) ?? []).length, 2);
    assert.match(row, /grid-cols-2/);
    assert.equal((row.match(/min-h-11/g) ?? []).length, 4);
  });

  it("BabyPumpSkeleton: L/R + amount ml 2×2", () => {
    const html = renderToStaticMarkup(createElement(BabyPumpSkeleton));
    assert.match(html, /data-skeleton="pump-timer-chips"/);
    assert.match(html, /data-skeleton="pump-amount-ml-chips"/);
    const amountIdx = html.indexOf('data-skeleton="pump-amount-ml-chips"');
    const amountChunk = html.slice(Math.max(0, amountIdx - 200), amountIdx + 700);
    assert.match(amountChunk, /grid-cols-2/);
    assert.equal((amountChunk.match(/min-h-11/g) ?? []).length, 4);
  });

  it("BabyDiaperSkeleton: flush 2×2 kind", () => {
    const html = renderToStaticMarkup(createElement(BabyDiaperSkeleton));
    const kindIdx = html.indexOf('data-skeleton="diaper-kind-2x2"');
    assert.ok(kindIdx >= 0);
    const kindChunk = html.slice(Math.max(0, kindIdx - 200), kindIdx + 700);
    assert.match(kindChunk, /grid-cols-2/);
    assert.match(kindChunk, /grid-rows-2/);
    assert.match(kindChunk, /gap-0/);
    assert.equal((kindChunk.match(/min-h-11/g) ?? []).length, 4);
  });

  it("BabySleepSkeleton: one TimedCareChip placeholder with concentric radii", () => {
    const html = renderToStaticMarkup(createElement(BabySleepSkeleton));
    const actionIdx = html.indexOf('data-skeleton="sleep-action-chips"');
    assert.ok(actionIdx >= 0);
    const actionChunk = html.slice(actionIdx, actionIdx + 500);
    assert.match(actionChunk, /rounded-\[var\(--radius-md\)\]/);
    assert.equal((actionChunk.match(/min-h-14/g) ?? []).length, 1);
  });
});
