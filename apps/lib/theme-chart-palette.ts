import type { StylePreset } from "@/components/theme-provider";

/** Chart series colors — mirror CSS `--chart-0` … `--chart-7` in app/globals.css */

export const CHART_PALETTE_QUIET_LIGHT = [
  "#1e66f5", // blue
  "#179299", // teal
  "#fe640b", // peach
  "#40a02b", // green
  "#8839ef", // mauve
  "#d20f39", // red
  "#04a5e5", // sky
  "#9ca0b0", // overlay0
] as const;

export const CHART_PALETTE_QUIET_DARK = [
  "#89b4fa", // blue
  "#94e2d5", // teal
  "#fab387", // peach
  "#a6e3a1", // green
  "#cba6f7", // mauve
  "#f38ba8", // red
  "#89dceb", // sky
  "#6c7086", // overlay0
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

/** Catppuccin red for expense series (e.g. cumulative flow). */
const EXPENSE_HOT_PASTEL: Record<
  StylePreset,
  { light: string; dark: string }
> = {
  quiet: { light: "#d20f39", dark: "#f38ba8" },
};

export function chartExpenseHotPastel(
  style: StylePreset,
  resolved: "light" | "dark",
): string {
  return EXPENSE_HOT_PASTEL[style][resolved];
}
