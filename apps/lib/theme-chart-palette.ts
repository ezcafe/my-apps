import type { StylePreset } from "@/components/theme-provider";

/** Chart series colors — mirror CSS `--chart-0` … `--chart-7` in app/globals.css */

export const CHART_PALETTE_APPLE_LIGHT = [
  "#0969da",
  "#8250df",
  "#bc4c00",
  "#1a7f37",
  "#0550ae",
  "#a40e26",
  "#6639ba",
  "#bf8700",
] as const;

export const CHART_PALETTE_APPLE_DARK = [
  "#88c0d0",
  "#b48ead",
  "#d08770",
  "#a3be8c",
  "#81a1c1",
  "#bf616a",
  "#5e81ac",
  "#ebcb8b",
] as const;

/** @deprecated Use chartPaletteFor — kept for gradual migration */
export const CHART_PALETTE_LIGHT = CHART_PALETTE_APPLE_LIGHT;
export const CHART_PALETTE_DARK = CHART_PALETTE_APPLE_DARK;

const CACHE = {
  apple: {
    light: [...CHART_PALETTE_APPLE_LIGHT],
    dark: [...CHART_PALETTE_APPLE_DARK],
  },
} as const;

export function chartPaletteFor(style: StylePreset, resolved: "light" | "dark"): readonly string[] {
  return CACHE[style][resolved];
}

/** @deprecated Use chartPaletteFor(style, resolved) */
export function chartPaletteForMode(resolved: "light" | "dark") {
  return chartPaletteFor("apple", resolved);
}

export function colorByIndex(
  resolved: "light" | "dark",
  index: number,
  style: StylePreset = "apple",
): string {
  const pal = chartPaletteFor(style, resolved);
  return pal[index % pal.length] ?? pal[0];
}

/** Warm coral / rose pastel for expense series (e.g. cumulative flow). */
const EXPENSE_HOT_PASTEL: Record<
  StylePreset,
  { light: string; dark: string }
> = {
  apple: { light: "#cf222e", dark: "#bf616a" },
};

export function chartExpenseHotPastel(
  style: StylePreset,
  resolved: "light" | "dark",
): string {
  return EXPENSE_HOT_PASTEL[style][resolved];
}
