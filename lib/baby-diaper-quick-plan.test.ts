import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_DIAPER_KIND_TILES,
  babyDiaperSheetSaveMutation,
  planBabyDiaperKindTap,
} from "@/lib/baby-diaper-quick-plan";

describe("planBabyDiaperKindTap", () => {
  it("Wet/Dry → instantSave kind only (S1)", () => {
    assert.deepEqual(planBabyDiaperKindTap("wet"), {
      kind: "instantSave",
      diaperKind: "wet",
      mutation: { diaperKind: "wet" },
    });
    assert.deepEqual(planBabyDiaperKindTap("dry"), {
      kind: "instantSave",
      diaperKind: "dry",
      mutation: { diaperKind: "dry" },
    });
  });

  it("Poop/Mixed → openSheet with medium default (W1 local draft)", () => {
    const dirty = planBabyDiaperKindTap("dirty");
    assert.equal(dirty.kind, "openSheet");
    if (dirty.kind === "openSheet") {
      assert.equal(dirty.diaperKind, "dirty");
      assert.equal(dirty.draftDefaults.amount, "medium");
      assert.equal(dirty.draftDefaults.color, null);
      assert.equal(dirty.draftDefaults.texture, null);
    }
    const mixed = planBabyDiaperKindTap("mixed");
    assert.equal(mixed.kind, "openSheet");
    if (mixed.kind === "openSheet") {
      assert.equal(mixed.diaperKind, "mixed");
      assert.equal(mixed.draftDefaults.amount, "medium");
      assert.equal(mixed.draftDefaults.color, null);
      assert.equal(mixed.draftDefaults.texture, null);
    }
  });

  it("exposes 2×2 tile order Wet Poop Mixed Dry", () => {
    assert.deepEqual([...BABY_DIAPER_KIND_TILES], [
      "wet",
      "dirty",
      "mixed",
      "dry",
    ]);
  });
});

describe("babyDiaperSheetSaveMutation", () => {
  it("always writes amount; includes optional color/texture", () => {
    assert.deepEqual(
      babyDiaperSheetSaveMutation("dirty", {
        color: "yellow",
        texture: null,
        amount: "medium",
      }),
      {
        diaperKind: "dirty",
        diaperColor: "yellow",
        diaperAmount: "medium",
      },
    );
  });

  it("texture-only omits color and still writes amount", () => {
    assert.deepEqual(
      babyDiaperSheetSaveMutation("mixed", {
        color: null,
        texture: "watery",
        amount: "medium",
      }),
      {
        diaperKind: "mixed",
        diaperTexture: "watery",
        diaperAmount: "medium",
      },
    );
  });

  it("writes smear and blowout amounts", () => {
    assert.deepEqual(
      babyDiaperSheetSaveMutation("dirty", {
        color: null,
        texture: null,
        amount: "smear",
      }),
      {
        diaperKind: "dirty",
        diaperAmount: "smear",
      },
    );
    assert.deepEqual(
      babyDiaperSheetSaveMutation("dirty", {
        color: "brown",
        texture: "hard",
        amount: "blowout",
      }),
      {
        diaperKind: "dirty",
        diaperColor: "brown",
        diaperTexture: "hard",
        diaperAmount: "blowout",
      },
    );
  });

  it("defaults amount to medium when draft amount missing", () => {
    assert.deepEqual(
      babyDiaperSheetSaveMutation("dirty", {
        color: null,
        texture: null,
        amount: undefined as unknown as "medium",
      }),
      {
        diaperKind: "dirty",
        diaperAmount: "medium",
      },
    );
  });
});
