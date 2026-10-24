import { z } from "zod";

/** Starter food-type presets (v1 — no catalog admin). */
export const FOOD_TYPES = [
  "pork",
  "beef",
  "chicken",
  "fish",
  "vegetable",
  "fruit",
  "dairy",
  "grain",
  "other",
] as const;

export type FoodType = (typeof FOOD_TYPES)[number];

export const foodTypeSchema = z.enum(FOOD_TYPES);

export const mealSlotSchema = z.enum(["breakfast", "lunch", "dinner"]);

export type MealSlot = z.infer<typeof mealSlotSchema>;

/** Calendar day as local YYYY-MM-DD. */
export const foodsLoggedOnSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "loggedOn must be YYYY-MM-DD");

const NOTE_MAX = 280;

export const foodsEntryCreateSchema = z.object({
  loggedOn: foodsLoggedOnSchema,
  foodType: foodTypeSchema,
  mealSlot: mealSlotSchema.optional().nullable(),
  note: z.string().trim().max(NOTE_MAX).optional().nullable(),
});

export type FoodsEntryCreate = z.infer<typeof foodsEntryCreateSchema>;

export const foodsEntryUpdateSchema = foodsEntryCreateSchema.partial().extend({
  loggedOn: foodsLoggedOnSchema.optional(),
  foodType: foodTypeSchema.optional(),
});

export type FoodsEntryUpdate = z.infer<typeof foodsEntryUpdateSchema>;

/** Distinct types for calendar icons (duplicates collapse). */
export function distinctFoodTypesForDay(
  entries: ReadonlyArray<{ foodType: FoodType }>,
): FoodType[] {
  const seen = new Set<FoodType>();
  const out: FoodType[] = [];
  for (const e of entries) {
    if (seen.has(e.foodType)) continue;
    seen.add(e.foodType);
    out.push(e.foodType);
  }
  return out;
}
