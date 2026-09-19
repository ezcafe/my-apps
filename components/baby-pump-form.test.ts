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

  it("custom ml confirm calls pump amount save path", () => {
    assert.match(src, /onConfirm=\{\(ml\) => \{[\s\S]*logPumpAmount\(ml\)/);
    assert.match(src, /method:\s*"pump"/);
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
