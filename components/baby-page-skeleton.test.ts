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
      (html.match(/data-skeleton="guideline-quiet-block"/g) ?? []).length,
      1,
    );
    assert.equal(
      (html.match(/data-skeleton="guideline-header"/g) ?? []).length,
      0,
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

  it("status before guidelines at bottom", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    const guidelinesIdx = html.indexOf('data-skeleton="home-row-guidelines"');
    const statusIdx = html.indexOf('data-skeleton="home-status"');
    assert.ok(guidelinesIdx >= 0, "guidelines present");
    assert.ok(statusIdx >= 0 && guidelinesIdx > statusIdx, "guidelines after status");
  });

  it("guideline quiet block mirrors collapsed Section I + II headers", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    const rowStart = html.indexOf('data-skeleton="home-row-guidelines"');
    assert.ok(rowStart >= 0);
    const row = html.slice(rowStart);
    assert.match(row, /data-skeleton="guideline-quiet-block"/);
    assert.match(row, /space-y-1/);
    assert.match(row, /data-skeleton="guideline-section-i"[^>]*min-h-11/);
    assert.match(row, /data-skeleton="guideline-section-ii"[^>]*min-h-11/);
    // Collapsed parity: only section headers, no nested stage skeleton rows.
    assert.equal(
      (row.match(/data-skeleton="guideline-stage"/g) ?? []).length,
      0,
      "no stage rows while Section II is collapsed by default",
    );
    assert.match(row, /data-skeleton="guide-caveat"/);
    assert.doesNotMatch(
      row,
      /data-skeleton="guideline-quiet-block"[^>]*\bh-24\b/,
      "not a single h-24 quiet bar",
    );
    assert.equal(
      (html.match(/data-skeleton="guideline-header"/g) ?? []).length,
      0,
    );
  });

  it("uses concentric radii tokens (outer md, nested sm)", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    assert.match(html, /rounded-\[var\(--radius-md\)\]/);
    assert.match(html, /rounded-\[var\(--radius-sm\)\]/);
    const bottleChips = html.slice(
      html.indexOf('data-skeleton="bottle-ml-chips"'),
      html.indexOf('data-skeleton="home-row-nap"'),
    );
    assert.match(bottleChips, /rounded-\[var\(--radius-md\)\]/);
    assert.match(html, /data-skeleton="home-row-diaper"/);
    assert.match(html, /data-skeleton="section-diaper-custom-time"/);
    assert.match(html, /data-skeleton="section-nap-custom-time"/);
    // Empty header slots — no fake Custom time heading skeleton text blocks with width labels.
    const napCustom = html.slice(
      html.indexOf('data-skeleton="section-nap-custom-time"'),
      html.indexOf('data-skeleton="home-row-diaper"'),
    );
    assert.match(napCustom, /data-skeleton-header="empty"/);
    const diaperCustom = html.slice(
      html.indexOf('data-skeleton="section-diaper-custom-time"'),
      html.indexOf('data-skeleton="home-row-pump"'),
    );
    assert.match(diaperCustom, /data-skeleton-header="empty"/);
    const kind = html.slice(
      html.indexOf('data-skeleton="diaper-kind-2x2"'),
      html.indexOf('data-skeleton="home-row-pump"'),
    );
    assert.match(kind, /rounded-\[var\(--radius-md\)\]/);
  });

  it("includes section footer stubs and status icon stubs", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    assert.ok(
      (html.match(/data-skeleton="section-footer"/g) ?? []).length >= 5,
      "footer stubs for breast/bottle/nap/diaper/pump",
    );
    const status = html.slice(html.indexOf('data-skeleton="home-status"'));
    assert.ok(
      (status.match(/size-5 shrink-0/g) ?? []).length >= 4,
      "status icon-sized stubs",
    );
  });

  it("shared col-span footers for nap/diaper; empty footer for tip-null pump-amount", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    const napRow = html.slice(
      html.indexOf('data-skeleton="home-row-nap"'),
      html.indexOf('data-skeleton="home-row-diaper"'),
    );
    assert.match(
      napRow,
      /data-skeleton="section-footer"[^>]*col-span-full|col-span-full[^>]*data-skeleton="section-footer"/,
      "nap row shared footer spans columns",
    );
    assert.doesNotMatch(
      napRow.slice(
        napRow.indexOf('data-skeleton="section-nap-custom-time"'),
        napRow.indexOf('data-skeleton="section-footer"'),
      ),
      /data-skeleton-footer="empty"/,
      "nap custom has no nested empty footer",
    );

    const diaperRow = html.slice(
      html.indexOf('data-skeleton="home-row-diaper"'),
      html.indexOf('data-skeleton="home-row-pump"'),
    );
    assert.match(
      diaperRow,
      /data-skeleton="section-footer"[^>]*col-span-full|col-span-full[^>]*data-skeleton="section-footer"/,
      "diaper row shared footer spans columns",
    );

    const start = html.indexOf('data-skeleton="section-pump-amount"');
    assert.ok(start >= 0, "section-pump-amount present");
    const afterOpen = html.indexOf(">", start);
    const endMarkers = [
      'data-skeleton="home-status"',
      'data-skeleton="home-row-',
    ]
      .map((m) => html.indexOf(m, afterOpen + 1))
      .filter((i) => i > start);
    const end = endMarkers.length > 0 ? Math.min(...endMarkers) : start + 1200;
    const chunk = html.slice(start, end);
    assert.match(
      chunk,
      /data-skeleton="section-footer"[^>]*data-skeleton-footer="empty"/,
      "section-pump-amount empty footer",
    );
    assert.doesNotMatch(
      chunk,
      /data-skeleton-footer="empty"[^>]*\bh-4\b|\bh-4\b[^>]*data-skeleton-footer="empty"/,
      "section-pump-amount empty footer has no h-4",
    );
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

  it("BabyDiaperSkeleton: 2-col full-row stretch with flush 2×2 kind + Custom", () => {
    const html = renderToStaticMarkup(createElement(BabyDiaperSkeleton));
    const rowIdx = html.indexOf('data-skeleton="diaper-form-row"');
    assert.ok(rowIdx >= 0, "diaper-form-row present");
    // style/className sit on the same opening tag before data-skeleton — look back.
    const row = html.slice(Math.max(0, rowIdx - 120), rowIdx + 1600);
    assert.match(row, /repeat\(2, minmax\(0, 1fr\)\)/);
    const kindIdx = row.indexOf('data-skeleton="diaper-kind-2x2"');
    const customIdx = row.indexOf('data-skeleton="diaper-custom-time"');
    assert.ok(kindIdx >= 0 && customIdx > kindIdx, "Custom sibling after kind");
    const kindChunk = row.slice(Math.max(0, kindIdx - 160), customIdx);
    assert.match(kindChunk, /grid-cols-2/);
    assert.match(kindChunk, /grid-rows-2/);
    assert.match(kindChunk, /gap-0/);
    assert.equal((kindChunk.match(/min-h-11/g) ?? []).length, 4);
    const customChunk = row.slice(Math.max(0, customIdx - 40), customIdx + 500);
    assert.match(customChunk, /min-h-\[calc\(2\*2\.75rem\+3px\)\]/);
    assert.match(customChunk, /rounded-\[var\(--radius-md\)\]/);
  });

  it("BabySleepSkeleton: 2-col full-row stretch with Nap chip + Custom", () => {
    const html = renderToStaticMarkup(createElement(BabySleepSkeleton));
    const actionIdx = html.indexOf('data-skeleton="sleep-action-chips"');
    assert.ok(actionIdx >= 0);
    const actionChunk = html.slice(Math.max(0, actionIdx - 120), actionIdx + 1200);
    assert.match(actionChunk, /repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(actionChunk, /data-skeleton="sleep-custom-time"/);
    assert.match(actionChunk, /rounded-\[var\(--radius-md\)\]/);
    assert.equal(
      (actionChunk.match(/min-h-\[calc\(2\*2\.75rem\+3px\)\]/g) ?? []).length,
      2,
      "Nap + Custom both Nap-sized",
    );
  });
});
