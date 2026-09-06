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
