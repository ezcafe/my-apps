import type { BabyGrowthPageChip } from "@/lib/baby-growth-page-chips";
import type { UsageRankedItem } from "@/lib/money-usage-quick-pick";

/** Unit chips for Growth MoneyCategoryField (single select). */
export function babyGrowthUnitQuickItems(
  kind: BabyGrowthPageChip,
): UsageRankedItem[] {
  if (kind === "weight") {
    return [
      { id: "kg", label: "kg", usageCount: 2 },
      { id: "lb", label: "lb", usageCount: 1 },
    ];
  }
  if (kind === "height" || kind === "head") {
    return [
      { id: "cm", label: "cm", usageCount: 2 },
      { id: "in", label: "in", usageCount: 1 },
    ];
  }
  if (kind === "temperature") {
    return [
      { id: "°C", label: "°C", usageCount: 2 },
      { id: "°F", label: "°F", usageCount: 1 },
    ];
  }
  return [];
}
