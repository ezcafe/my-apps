import type { StylePreset } from "@/components/theme-provider";

/** Chart series colors — mirror CSS `--chart-0` … `--chart-7` per preset in app/globals.css */

export const CHART_PALETTE_LINEAR_LIGHT = [
  "#5e6ad2",
  "#7c3aed",
  "#ea580c",
  "#16a34a",
  "#2563eb",
  "#c2410c",
  "#9333ea",
  "#1d4ed8",
] as const;

export const CHART_PALETTE_LINEAR_DARK = [
  "#7c83eb",
  "#a78bfa",
  "#fb923c",
  "#4ade80",
  "#60a5fa",
  "#f97316",
  "#c084fc",
  "#818cf8",
] as const;

export const CHART_PALETTE_APPLE_LIGHT = [
  "#007aff",
  "#af52de",
  "#ff9500",
  "#34c759",
  "#5856d6",
  "#ff3b30",
  "#64d2ff",
  "#ffcc00",
] as const;

export const CHART_PALETTE_APPLE_DARK = [
  "#0a84ff",
  "#bf5af2",
  "#ff9f0a",
  "#30d158",
  "#5e5ce6",
  "#ff453a",
  "#64d2ff",
  "#ffd60a",
] as const;

export const CHART_PALETTE_SWISS_LIGHT = [
  "#e23d3d",
  "#0e0e0e",
  "#737373",
  "#15803d",
  "#1d4ed8",
  "#a16207",
  "#7c3aed",
  "#0369a1",
] as const;

export const CHART_PALETTE_SWISS_DARK = [
  "#f87171",
  "#fafafa",
  "#a3a3a3",
  "#86efac",
  "#93c5fd",
  "#fcd34d",
  "#d8b4fe",
  "#67e8f9",
] as const;

export const CHART_PALETTE_NOTION_LIGHT = [
  "#2f7e8e",
  "#7c6f64",
  "#e5484d",
  "#30a46c",
  "#0091ff",
  "#f5a524",
  "#8e4ec6",
  "#12a594",
] as const;

export const CHART_PALETTE_NOTION_DARK = [
  "#5eb3c4",
  "#b8b5ad",
  "#ff6369",
  "#4cc38a",
  "#52a9ff",
  "#ffc53d",
  "#bf7af0",
  "#3cdbbc",
] as const;

/** @deprecated Use chartPaletteFor — kept for gradual migration */
export const CHART_PALETTE_LIGHT = CHART_PALETTE_LINEAR_LIGHT;
export const CHART_PALETTE_DARK = CHART_PALETTE_LINEAR_DARK;

const CACHE = {
  linear: {
    light: [...CHART_PALETTE_LINEAR_LIGHT],
    dark: [...CHART_PALETTE_LINEAR_DARK],
  },
  apple: {
    light: [...CHART_PALETTE_APPLE_LIGHT],
    dark: [...CHART_PALETTE_APPLE_DARK],
  },
  swiss: {
    light: [...CHART_PALETTE_SWISS_LIGHT],
    dark: [...CHART_PALETTE_SWISS_DARK],
  },
  notion: {
    light: [...CHART_PALETTE_NOTION_LIGHT],
    dark: [...CHART_PALETTE_NOTION_DARK],
  },
} as const;

export function chartPaletteFor(style: StylePreset, resolved: "light" | "dark"): readonly string[] {
  return CACHE[style][resolved];
}

/** @deprecated Use chartPaletteFor(style, resolved) */
export function chartPaletteForMode(resolved: "light" | "dark") {
  return chartPaletteFor("linear", resolved);
}

export function colorByIndex(
  resolved: "light" | "dark",
  index: number,
  style: StylePreset = "linear",
): string {
  const pal = chartPaletteFor(style, resolved);
  return pal[index % pal.length] ?? pal[0];
}

/** Warm coral / rose pastel for expense series (e.g. cumulative flow). */
const EXPENSE_HOT_PASTEL: Record<
  StylePreset,
  { light: string; dark: string }
> = {
  linear: { light: "#e85d7a", dark: "#ff8fab" },
  apple: { light: "#ff6b5c", dark: "#ff9588" },
  swiss: { light: "#e87070", dark: "#ffb4b4" },
  notion: { light: "#e35d62", dark: "#ff9ea4" },
};

export function chartExpenseHotPastel(
  style: StylePreset,
  resolved: "light" | "dark",
): string {
  return EXPENSE_HOT_PASTEL[style][resolved];
}
