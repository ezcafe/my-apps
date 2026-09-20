import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { planBabyDiaperKindTap } from "@/lib/baby-diaper-quick-plan";
import { babyLogDiaperMutationInput } from "@/lib/baby-home-custom-time";

describe("BabyDiaperForm source chrome", () => {
  const src = readFileSync(
    resolve(process.cwd(), "components/baby-diaper-form.tsx"),
    "utf8",
  );

  it("uses shared kind control + detail sheet + log diaper clock builder", () => {
    assert.match(src, /BabyDiaperKindControl/);
    assert.match(src, /BabyDiaperDetailSheet/);
    assert.match(src, /BabyCustomTimeChip/);
    assert.match(src, /babyLogDiaperMutationInput/);
    assert.match(src, /fields="time\+diaperKind"/);
    assert.match(src, /planBabyDiaperKindTap/);
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

describe("BabyDiaperForm Custom time mutation wiring", () => {
  const ISO = "2026-09-20T06:40:00.000Z";

  it("pending clock → create input spreads occurredAt (not endedAt)", () => {
    const input = babyLogDiaperMutationInput({
      kind: "wet",
      pendingIso: ISO,
    });
    assert.equal(input.kind, "wet");
    assert.equal(input.occurredAt, ISO);
    assert.equal("endedAt" in input, false);
  });

  it("no pending → create input has no time fields", () => {
    const input = babyLogDiaperMutationInput({
      kind: "dirty",
      diaperColor: "yellow",
      pendingIso: null,
    });
    assert.equal(input.kind, "dirty");
    assert.equal(input.color, "yellow");
    assert.equal("occurredAt" in input, false);
    assert.equal("endedAt" in input, false);
  });
});
