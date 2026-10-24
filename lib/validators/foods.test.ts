import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOOD_TYPES,
  foodsEntryCreateSchema,
} from "@/lib/validators/foods";

describe("foodsEntrySchema", () => {
  it("foodsEntrySchema rejects unknown foodType", () => {
    const parsed = foodsEntryCreateSchema.safeParse({
      loggedOn: "2026-10-21",
      foodType: "pizza",
    });
    assert.equal(parsed.success, false);
  });

  it("foodsEntrySchema accepts mealSlot and note", () => {
    const parsed = foodsEntryCreateSchema.safeParse({
      loggedOn: "2026-10-21",
      foodType: "pork",
      mealSlot: "lunch",
      note: "stir fry",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.foodType, "pork");
      assert.equal(parsed.data.mealSlot, "lunch");
      assert.equal(parsed.data.note, "stir fry");
    }
  });

  it("exports expected starter presets", () => {
    assert.ok(FOOD_TYPES.includes("pork"));
    assert.ok(FOOD_TYPES.includes("other"));
    assert.equal(FOOD_TYPES.length, 9);
  });
});
