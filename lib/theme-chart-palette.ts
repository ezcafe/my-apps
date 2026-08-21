import type { StylePreset } from "@/components/theme-provider";

/** Chart series colors — mirror CSS `--chart-0` … `--chart-7` in app/globals.css */

export const CHART_PALETTE_QUIET_LIGHT = [
  "#0d9488", // teal
  "#0f766e", // teal dark
  "#f59e0b", // amber
  "#059669", // emerald
  "#737373", // gray
  "#dc2626", // red
  "#a0a0a0", // light gray
  "#2d2d2d", // near black
] as const;

export const CHART_PALETTE_QUIET_DARK = [
  "#2dd4bf", // teal
  "#5eead4", // teal light
  "#fbbf24", // amber
  "#34d399", // emerald
  "#a0a0a0", // gray
  "#f87171", // red
  "#737373", // muted gray
  "#e5e5e5", // near white
] as const;

/** @deprecated Use CHART_PALETTE_QUIET_* — kept for gradual migration */
export const CHART_PALETTE_APPLE_LIGHT = CHART_PALETTE_QUIET_LIGHT;
export const CHART_PALETTE_APPLE_DARK = CHART_PALETTE_QUIET_DARK;

/** @deprecated Use chartPaletteFor — kept for gradual migration */
export const CHART_PALETTE_LIGHT = CHART_PALETTE_QUIET_LIGHT;
export const CHART_PALETTE_DARK = CHART_PALETTE_QUIET_DARK;

const CACHE = {
  quiet: {
    light: [...CHART_PALETTE_QUIET_LIGHT],
    dark: [...CHART_PALETTE_QUIET_DARK],
  },
} as const;

export function chartPaletteFor(style: StylePreset, resolved: "light" | "dark"): readonly string[] {
  return CACHE[style][resolved];
}

/** @deprecated Use chartPaletteFor(style, resolved) */
export function chartPaletteForMode(resolved: "light" | "dark") {
  return chartPaletteFor("quiet", resolved);
}

export function colorByIndex(
  resolved: "light" | "dark",
  index: number,
  style: StylePreset = "quiet",
): string {
  const pal = chartPaletteFor(style, resolved);
  return pal[index % pal.length] ?? pal[0];
}

/** Expense-series red (e.g. cumulative flow). */
const EXPENSE_HOT_PASTEL: Record<
  StylePreset,
  { light: string; dark: string }
> = {
  quiet: { light: "#dc2626", dark: "#f87171" },
};

export function chartExpenseHotPastel(
  style: StylePreset,
  resolved: "light" | "dark",
): string {
  return EXPENSE_HOT_PASTEL[style][resolved];
}
