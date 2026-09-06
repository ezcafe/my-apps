import type { BabyMessageKey } from "@/messages/baby/en";

export type BabyInsightsPeriodChipLabels = {
  showing: string;
  applyToUpdate: string;
};

export type BabyInsightsDateRangeFilterLabels = {
  apply: string;
  applyFilters: string;
  reset: string;
  applying: string;
};

/** Period chip copy from baby i18n (avoids Money English defaults on VI). */
export function babyInsightsPeriodChipLabels(
  t: (key: BabyMessageKey) => string,
): BabyInsightsPeriodChipLabels {
  return {
    showing: t("insights.showing"),
    applyToUpdate: t("insights.applyToUpdate"),
  };
}

/** Date filter Apply/Reset chrome from baby i18n. */
export function babyInsightsDateRangeFilterLabels(
  t: (key: BabyMessageKey) => string,
): BabyInsightsDateRangeFilterLabels {
  return {
    apply: t("insights.apply"),
    applyFilters: t("insights.applyFilters"),
    reset: t("insights.reset"),
    applying: t("insights.applying"),
  };
}
