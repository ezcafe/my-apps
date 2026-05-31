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

const TEXT_BY_TONE: Record<BudgetUtilizationTone, string> = {
  ok: "text-[color:var(--chart-3)]",
  warn: "text-[color:var(--chart-2)]",
  danger: "text-[color:var(--chart-5)]",
};

export function budgetUtilizationTextClass(
  tone: BudgetUtilizationTone | null | undefined,
): string | undefined {
  if (!tone) return undefined;
  return TEXT_BY_TONE[tone];
}
