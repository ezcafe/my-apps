/** Shared chart card layout tokens — keep out of the heavy chart-cards module. */

export const CHART_CARD_HEIGHT_FULL = "h-[260px] min-h-[260px] max-h-[260px]";
export const CHART_CARD_HEIGHT_HALF = "h-[280px] min-h-[280px] max-h-[280px]";
export const CHART_CARD_HEIGHT_TALL = "h-[360px] min-h-[360px] max-h-[360px]";
export const CHART_CARD_HEIGHT_FILL =
  "h-full min-h-0 max-h-none lg:h-full lg:min-h-0 lg:max-h-none";
export const CHART_CARD_MIN_HEIGHT_HALF_PX = 280;
export const CHART_CARD_LAYOUT = "flex flex-col";
export const CHART_SLOT_CLASS = "h-full min-h-0 overflow-hidden";

/** Insights hero row: Spend (2 rows) + Income vs expenses / Net flow (1/3 width each). */
export const ANALYTICS_HERO_ROW_GRID =
  "col-span-2 grid min-w-0 grid-cols-1 gap-3 md:col-span-6 lg:col-span-12 lg:grid-cols-12 lg:grid-rows-[280px_280px]";
export const ANALYTICS_HERO_SPEND_CLASS =
  "lg:col-span-8 lg:row-span-2 lg:col-start-1 lg:row-start-1";
export const ANALYTICS_HERO_SIDE_CLASS =
  "lg:col-span-4 lg:col-start-9";
