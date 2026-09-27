import type { BabyMessageKey } from "@/messages/baby/en";
import {
  BABY_INSIGHTS_CARE_CHIPS,
  BABY_INSIGHTS_GROWTH_CHIPS,
  type BabyInsightsCareChip,
  type BabyInsightsChipSelection,
  type BabyInsightsGrowthChip,
} from "@/lib/baby-insights-filters";

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

/** Toolbar multi-select shape (mirrors InsightsMultiSelectFilter without UI import). */
export type BabyInsightsToolbarMultiSelect = {
  id: string;
  label: string;
  legend: string;
  ariaLabel: string;
  items: readonly { id: string; label: string }[];
  value: string[];
  otherLabel: string;
  emptyMessage: string;
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

function careChipLabelKey(chip: BabyInsightsCareChip): BabyMessageKey {
  if (chip === "feed") return "insights.chipFeed";
  if (chip === "sleep") return "insights.chipSleep";
  return "insights.chipDiaper";
}

function growthChipLabelKey(chip: BabyInsightsGrowthChip): BabyMessageKey {
  if (chip === "weight") return "growth.weight";
  if (chip === "height") return "growth.height";
  if (chip === "head") return "growth.head";
  if (chip === "temperature") return "growth.temperature";
  return "growth.medication";
}

/**
 * Care + Growth multi-selects for Insights date toolbar (HTML: Care | Growth).
 * Values are chip ids; empty value = all for that group.
 */
export function babyInsightsCareGrowthMultiSelects(
  chips: BabyInsightsChipSelection,
  t: (key: BabyMessageKey) => string,
): BabyInsightsToolbarMultiSelect[] {
  return [
    {
      id: "care",
      label: t("insights.filterMenuCare"),
      legend: t("insights.filterCareLegend"),
      ariaLabel: t("insights.filterCareLegend"),
      items: BABY_INSIGHTS_CARE_CHIPS.map((id) => ({
        id,
        label: t(careChipLabelKey(id)),
      })),
      value: [...chips.careTypes],
      otherLabel: t("insights.filterCareOther"),
      emptyMessage: t("insights.filterCareEmpty"),
    },
    {
      id: "growth",
      label: t("insights.filterMenuGrowth"),
      legend: t("insights.filterGrowthLegend"),
      ariaLabel: t("insights.filterGrowthAria"),
      items: BABY_INSIGHTS_GROWTH_CHIPS.map((id) => ({
        id,
        label: t(growthChipLabelKey(id)),
      })),
      value: [...chips.growthKinds],
      otherLabel: t("insights.filterGrowthOther"),
      emptyMessage: t("insights.filterGrowthEmpty"),
    },
  ];
}

/** Apply a Care or Growth multi-select change onto chip selection. */
export function applyBabyInsightsToolbarMultiSelect(
  chips: BabyInsightsChipSelection,
  filterId: string,
  nextIds: readonly string[],
): BabyInsightsChipSelection {
  if (filterId === "care") {
    const careTypes = nextIds.filter((id): id is BabyInsightsCareChip =>
      (BABY_INSIGHTS_CARE_CHIPS as readonly string[]).includes(id),
    );
    return { ...chips, careTypes };
  }
  if (filterId === "growth") {
    const growthKinds = nextIds.filter((id): id is BabyInsightsGrowthChip =>
      (BABY_INSIGHTS_GROWTH_CHIPS as readonly string[]).includes(id),
    );
    return { ...chips, growthKinds };
  }
  return chips;
}
