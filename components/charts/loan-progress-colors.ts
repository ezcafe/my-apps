import { chartIncomeColor } from "@/components/charts/chart-income-expense-colors";
import type { StylePreset } from "@/components/theme-provider";
import { colorByIndex } from "@/lib/theme-chart-palette";

export type LoanProgressSeriesKey = "actual" | "scheduled" | "projected";

export function loanProgressSeriesColors(
  resolved: "light" | "dark",
  style: StylePreset,
): Record<LoanProgressSeriesKey, string> {
  return {
    actual: chartIncomeColor(resolved, style),
    scheduled: "var(--muted)",
    projected: colorByIndex(resolved, 2, style),
  };
}
