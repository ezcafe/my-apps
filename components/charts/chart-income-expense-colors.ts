import { chartExpenseHotPastel, colorByIndex } from "@/components/charts/chart-colors";
import type { StylePreset } from "@/components/theme-provider";

export function chartIncomeColor(
  resolved: "light" | "dark",
  stylePreset: StylePreset,
): string {
  return colorByIndex(resolved, 3, stylePreset);
}

export function chartExpenseColor(
  resolved: "light" | "dark",
  stylePreset: StylePreset,
): string {
  return chartExpenseHotPastel(stylePreset, resolved);
}
