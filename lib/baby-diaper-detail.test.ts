import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_DIAPER_AMOUNTS,
  BABY_DIAPER_COLORS,
  BABY_DIAPER_KINDS,
  BABY_DIAPER_TEXTURES,
  babyDiaperColorIsRedFlag,
  babyDiaperDefaultAmount,
  babyDiaperDetailAllowed,
  babyDiaperTextureNeedsCaution,
  toggleOptionalDiaperChip,
} from "@/lib/baby-diaper-detail";

describe("baby diaper detail enums", () => {
  it("exposes design kind / color / texture / amount sets", () => {
    assert.deepEqual([...BABY_DIAPER_KINDS], ["wet", "dirty", "mixed", "dry"]);
    assert.deepEqual([...BABY_DIAPER_COLORS], [
      "yellow",
      "brown",
      "green",
      "black",
      "white_pale",
      "red_bloody",
    ]);
    assert.deepEqual([...BABY_DIAPER_TEXTURES], [
      "soft",
      "seedy",
      "mushy",
      "watery",
      "hard",
      "formed",
    ]);
    assert.deepEqual([...BABY_DIAPER_AMOUNTS], [
      "smear",
      "medium",
      "blowout",
    ]);
  });

  it("defaults amount to medium", () => {
    assert.equal(babyDiaperDefaultAmount(), "medium");
  });

  it("allows detail only for dirty and mixed", () => {
    assert.equal(babyDiaperDetailAllowed("wet"), false);
    assert.equal(babyDiaperDetailAllowed("dry"), false);
    assert.equal(babyDiaperDetailAllowed("dirty"), true);
    assert.equal(babyDiaperDetailAllowed("mixed"), true);
  });

  it("flags only white_pale and red_bloody colors", () => {
    for (const color of BABY_DIAPER_COLORS) {
      const expect =
        color === "white_pale" || color === "red_bloody";
      assert.equal(
        babyDiaperColorIsRedFlag(color),
        expect,
        color,
      );
    }
  });

  it("cautions only watery and hard textures", () => {
    for (const texture of BABY_DIAPER_TEXTURES) {
      const expect = texture === "watery" || texture === "hard";
      assert.equal(
        babyDiaperTextureNeedsCaution(texture),
        expect,
        texture,
      );
    }
  });

  it("toggles optional color/texture chips off on second press", () => {
    assert.equal(toggleOptionalDiaperChip(null, "yellow"), "yellow");
    assert.equal(toggleOptionalDiaperChip("yellow", "yellow"), null);
    assert.equal(toggleOptionalDiaperChip("yellow", "brown"), "brown");
    assert.equal(toggleOptionalDiaperChip(null, "soft"), "soft");
    assert.equal(toggleOptionalDiaperChip("soft", "soft"), null);
  });
});
