/** Budget utilization tones aligned with /money/analytics chart palette (--chart-* tokens). */

export type BudgetUtilizationTone = "ok" | "warn" | "danger";

export function budgetUtilizationTone(
  progressPct: number | undefined | null,
): BudgetUtilizationTone | null {
  if (progressPct == null || !Number.isFinite(progressPct)) return null;
  if (progressPct < 50) return "ok";
  if (progressPct < 80) return "warn";
  return "danger";
}

const FILL_COLOR_BY_TONE: Record<BudgetUtilizationTone, string> = {
  ok: "var(--chart-3)",
  warn: "var(--chart-2)",
  danger: "var(--chart-5)",
};

/** Width of the chip fill bar (0–100). Values above 100% still render a full bar. */
export function clampBudgetUtilizationWidthPct(progressPct: number): number {
  if (!Number.isFinite(progressPct) || progressPct < 0) return 0;
  if (progressPct > 100) return 100;
  return progressPct;
}

export function budgetUtilizationFillColor(
  tone: BudgetUtilizationTone,
): string {
  return FILL_COLOR_BY_TONE[tone];
}

export type BudgetUtilizationChipFill = {
  widthPct: number;
  fillColor: string;
  /** Raw utilization for tooltips (may exceed 100). */
  progressPct: number;
};

export function budgetUtilizationChipFill(
  progressPct: number | undefined | null,
): BudgetUtilizationChipFill | null {
  if (progressPct == null || !Number.isFinite(progressPct)) return null;
  const tone = budgetUtilizationTone(progressPct);
  if (!tone) return null;
  return {
    widthPct: clampBudgetUtilizationWidthPct(progressPct),
    fillColor: budgetUtilizationFillColor(tone),
    progressPct,
  };
}

/** Matches analytics-budgets-section: spent above limit. */
export function budgetUtilizationOverBudget(
  progressPct: number | undefined | null,
): boolean {
  return progressPct != null && Number.isFinite(progressPct) && progressPct > 100;
}

/** Fill aligned with /money/analytics budget bars (accent / destructive). */
export function budgetUtilizationAnalyticsFill(
  progressPct: number | undefined | null,
): BudgetUtilizationChipFill | null {
  if (progressPct == null || !Number.isFinite(progressPct)) return null;
  return {
    widthPct: clampBudgetUtilizationWidthPct(progressPct),
    fillColor: budgetUtilizationOverBudget(progressPct)
      ? "var(--destructive)"
      : "var(--accent)",
    progressPct,
  };
}

export function budgetUtilizationPctTextClassName(
  progressPct: number,
  opts?: { selected?: boolean },
): string {
  if (budgetUtilizationOverBudget(progressPct)) return "text-destructive";
  if (opts?.selected) return "text-accent-foreground/80";
  return "text-muted";
}
