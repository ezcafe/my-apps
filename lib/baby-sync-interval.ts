/** Baby Care timeline auto-sync interval (minutes → ms). */

const DEFAULT_MINUTES = 1;

export function getBabySyncIntervalMinutes(
  raw: string | undefined | null = process.env.BABY_SYNC_INTERVAL_MINUTES,
): number {
  if (raw == null || raw.trim() === "") return DEFAULT_MINUTES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_MINUTES;
  return Math.min(Math.floor(n), 60);
}

export function babySyncIntervalMs(
  raw?: string | null,
): number {
  return getBabySyncIntervalMinutes(raw) * 60_000;
}

/** TanStack Query refetchInterval: false when tab hidden. */
export function babyRefetchInterval(
  minutes: number,
  visibilityState: DocumentVisibilityState | "visible" = "visible",
): number | false {
  if (visibilityState !== "visible") return false;
  return Math.max(1, minutes) * 60_000;
}
