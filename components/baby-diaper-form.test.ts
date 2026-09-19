import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { planBabyDiaperKindTap } from "@/lib/baby-diaper-quick-plan";

describe("BabyDiaperForm source chrome", () => {
  const src = readFileSync(
    resolve(process.cwd(), "components/baby-diaper-form.tsx"),
    "utf8",
  );

  it("uses shared kind control + detail sheet", () => {
    assert.match(src, /BabyDiaperKindControl/);
    assert.match(src, /BabyDiaperDetailSheet/);
    assert.doesNotMatch(src, /baby-diaper-kind-chips/);
  });

  it("opens sheet for dirty/mixed; wet/dry plan is instantSave", () => {
    assert.match(src, /plan\.kind === "instantSave"/);
    assert.match(src, /setDiaperSheet/);
    assert.equal(planBabyDiaperKindTap("dirty").kind, "openSheet");
    assert.equal(planBabyDiaperKindTap("wet").kind, "instantSave");
    assert.equal(planBabyDiaperKindTap("dry").kind, "instantSave");
  });
});
