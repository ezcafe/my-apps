import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyHomeSkeleton } from "@/components/baby-page-skeleton";

describe("BabyHomeSkeleton section headers + chips parity", () => {
  it("uses locked section order breast → bottle → nap → diaper", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    const breast = html.indexOf('data-skeleton="section-breast"');
    const bottle = html.indexOf('data-skeleton="section-bottle"');
    const nap = html.indexOf('data-skeleton="section-nap"');
    const diaper = html.indexOf('data-skeleton="section-diaper"');
    const row = html.indexOf('data-skeleton="home-row-bottle-nap-diaper"');
    assert.ok(breast >= 0 && bottle > breast && nap > bottle && diaper > nap);
    assert.ok(row > breast && row < bottle);
  });

  it("mirrors flush bottle chips + Custom and flush 2×2 Kind", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));

    assert.match(html, /data-skeleton="bottle-ml-chips"/);
    assert.match(html, /data-skeleton="diaper-kind-2x2"/);
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

  it("reserves guideCaveat slot before status (CLS with birthDate)", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    const diaperIdx = html.indexOf('data-skeleton="section-diaper"');
    const caveatIdx = html.indexOf('data-skeleton="guide-caveat"');
    const statusIdx = html.indexOf('data-skeleton="home-status"');
    assert.ok(diaperIdx >= 0, "diaper present");
    assert.ok(caveatIdx > diaperIdx, "caveat after diaper");
    assert.ok(statusIdx > caveatIdx, "caveat before status");
  });

  it("uses concentric radii tokens (outer md, nested sm)", () => {
    const html = renderToStaticMarkup(createElement(BabyHomeSkeleton));
    assert.match(html, /rounded-\[var\(--radius-md\)\]/);
    assert.match(html, /rounded-\[var\(--radius-sm\)\]/);
    // Outer chip/kind shells are md; tip/label placeholders are sm
    const bottleChips = html.slice(
      html.indexOf('data-skeleton="bottle-ml-chips"'),
      html.indexOf('data-skeleton="section-nap"'),
    );
    assert.match(bottleChips, /rounded-\[var\(--radius-md\)\]/);
    const kind = html.slice(
      html.indexOf('data-skeleton="diaper-kind-2x2"'),
      html.indexOf('data-skeleton="guide-caveat"'),
    );
    assert.match(kind, /rounded-\[var\(--radius-md\)\]/);
  });
});