import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distinctFoodTypesForDay } from "@/lib/validators/foods";

describe("distinctFoodTypesForDay", () => {
  it("distinctFoodTypesForDay collapses duplicate types", () => {
    const types = distinctFoodTypesForDay([
      { foodType: "pork" },
      { foodType: "beef" },
      { foodType: "pork" },
      { foodType: "vegetable" },
    ]);
    assert.deepEqual(types, ["pork", "beef", "vegetable"]);
  });
});
