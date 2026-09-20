import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("BabyPumpForm source chrome", () => {
  const src = readFileSync(
    resolve(process.cwd(), "components/baby-pump-form.tsx"),
    "utf8",
  );

  it("uses shared pump pair + ml; no breast chips", () => {
    assert.match(src, /BabyPumpSidePair/);
    assert.match(src, /BabyMlChipSection/);
    assert.match(src, /BabyCustomMlModal/);
    assert.doesNotMatch(src, /BabyBreastSidePair/);
    assert.doesNotMatch(src, /breast_l/);
  });

  it("custom ml confirm seeds pending; second Custom tap saves (D4)", () => {
    assert.match(src, /setPumpFromCustom\(true\)/);
    assert.match(src, /babyHomeCustomMlTapAction/);
    assert.match(src, /method:\s*"pump"/);
    // Confirm must not auto-save — second Custom tap saves.
    assert.doesNotMatch(
      src,
      /onConfirm=\{\(ml\) => \{[\s\S]*logPumpAmount\(ml(?:,\s*true)?\)/,
    );
  });

  it("Custom Done flash wires keep-from-custom helper into customSelected", () => {
    assert.match(src, /babyHomeKeepFromCustomAfterAmountSuccess/);
    assert.match(src, /resolveBabyHomeCustomSelected/);
    assert.match(src, /customSelected=\{pumpCustomSelected\}/);
    assert.doesNotMatch(src, /customSelected=\{false\}/);
    assert.match(src, /setPumpFromCustom\(keepFromCustom\)/);
  });
});

describe("baby pump route", () => {
  it("page mounts BabyPumpForm", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/(shell)/baby/pump/page.tsx"),
      "utf8",
    );
    assert.match(src, /BabyPumpForm/);
  });
});
