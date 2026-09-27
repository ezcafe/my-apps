import { babyInsightsDateBoundsIso } from "@/lib/baby-insights-default-range";

export type BabyDrillTimelineRow = {
  id: string;
  kind: string;
  type: string;
  at: string;
  summary?: string;
};

export type BabyChartDrilldownPayload = {
  title: string;
  /** ISO date YYYY-MM-DD */
  day: string;
  careTypes?: ReadonlyArray<"feed" | "sleep" | "diaper" | "pump">;
};

/** Normalize chart day keys to YYYY-MM-DD (strip time if present). */
export function babyDrillDayKey(day: string): string {
  return day.slice(0, 10);
}

/**
 * Timeline GraphQL requires ISO datetimes with offset — never pass YYYY-MM-DD.
 * Use this at the query boundary for chart-day drilldowns.
 */
export function babyTimelineBoundsForDrillDay(day: string): {
  from: string;
  to: string;
} {
  const key = babyDrillDayKey(day);
  return babyInsightsDateBoundsIso(key, key);
}

export function babyDrilldownForHydrationDay(input: {
  day: string;
  series: "wet" | "feeds";
}): BabyChartDrilldownPayload {
  const day = babyDrillDayKey(input.day);
  return {
    title:
      input.series === "wet" ? `Diapers · ${day}` : `Feeds · ${day}`,
    day,
    careTypes: input.series === "wet" ? ["diaper"] : ["feed"],
  };
}

export function filterTimelineRowsForDrill(
  rows: ReadonlyArray<BabyDrillTimelineRow>,
  drill: BabyChartDrilldownPayload,
): BabyDrillTimelineRow[] {
  return rows.filter((row) => {
    const day = babyDrillDayKey(row.at);
    if (day !== drill.day) return false;
    if (!drill.careTypes || drill.careTypes.length === 0) return true;
    if (row.kind !== "care") return false;
    return drill.careTypes.includes(
      row.type as "feed" | "sleep" | "diaper" | "pump",
    );
  });
}
