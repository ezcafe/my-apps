import type { FoodType } from "@/lib/validators/foods";

/** Short label / emoji-free letter mark for calendar cells. */
export const FOOD_TYPE_MARK: Record<FoodType, string> = {
  pork: "P",
  beef: "B",
  chicken: "C",
  fish: "F",
  vegetable: "V",
  fruit: "U",
  dairy: "D",
  grain: "G",
  other: "O",
};

export const FOOD_TYPE_LABEL: Record<FoodType, string> = {
  pork: "Pork",
  beef: "Beef",
  chicken: "Chicken",
  fish: "Fish",
  vegetable: "Vegetable",
  fruit: "Fruit",
  dairy: "Dairy",
  grain: "Grain",
  other: "Other",
};
