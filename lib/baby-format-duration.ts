/**
 * Compact session length for timeline / Insights.
 * Examples: 12m, 1h, 1h 5m.
 */
export function formatBabyDurationCompact(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const totalMin = Math.floor(sec / 60);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export type BabyDurationLocale = "en" | "vi";

/**
 * Locale-aware duration for home next-in / overdue (not timeline compact).
 * EN: "5min", "1h", "1h 5min", "5h 30min"
 * VI: "5 phút", "1 giờ", "1 giờ 5 phút"
 */
export function formatBabyDurationLocale(
  totalSec: number,
  locale: BabyDurationLocale = "en",
): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const totalMin = Math.floor(sec / 60);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;

  if (locale === "vi") {
    if (hours <= 0) return `${minutes} phút`;
    if (minutes <= 0) return `${hours} giờ`;
    return `${hours} giờ ${minutes} phút`;
  }

  if (hours <= 0) return `${minutes}min`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
