import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFoodsAnalysisPrompt,
  parseFoodsAnalysisResponse,
  upsertFoodAnalysisOnError,
  filterEntriesInAnalysisWindow,
} from "@/features/foods/server/analyze-foods";
import type { FoodType } from "@/lib/validators/foods";

describe("analyze-foods", () => {
  it("buildFoodsAnalysisPrompt includes only last 7 days", () => {
    const today = "2026-10-21";
    const entries = [
      { loggedOn: "2026-10-21", foodType: "pork" as FoodType, mealSlot: null, note: null },
      { loggedOn: "2026-10-15", foodType: "beef" as FoodType, mealSlot: null, note: null },
      { loggedOn: "2026-10-14", foodType: "fish" as FoodType, mealSlot: null, note: null },
    ];
    // Inclusive 7-day window: today − 6 … today → 2026-10-15 … 2026-10-21
    const inWindow = filterEntriesInAnalysisWindow(entries, today);
    assert.equal(inWindow.length, 2);
    assert.ok(inWindow.every((e) => e.loggedOn >= "2026-10-15"));
    const prompt = buildFoodsAnalysisPrompt(inWindow, today);
    assert.match(prompt, /variety|balance/i);
    assert.match(prompt, /next day/i);
    assert.doesNotMatch(prompt, /2026-10-14/);
  });

  it("parseFoodsAnalysisResponse maps summary and suggestions", () => {
    const parsed = parseFoodsAnalysisResponse(
      JSON.stringify({
        summary: "Good mix of protein and veg.",
        suggestions: ["Add fruit tomorrow", "Try grain at breakfast"],
      }),
    );
    assert.equal(parsed.summary, "Good mix of protein and veg.");
    assert.deepEqual(parsed.suggestions, [
      "Add fruit tomorrow",
      "Try grain at breakfast",
    ]);
  });

  it("upsertFoodAnalysisOnError preserves prior ok summary", () => {
    const prior = {
      summary: "Prior balance note",
      suggestions: ["Keep vegetables"],
      status: "ok" as const,
      errorMessage: null as string | null,
    };
    const next = upsertFoodAnalysisOnError(prior, "LLM timeout");
    assert.equal(next.summary, "Prior balance note");
    assert.deepEqual(next.suggestions, ["Keep vegetables"]);
    assert.equal(next.status, "error");
    assert.equal(next.errorMessage, "LLM timeout");
  });
});
