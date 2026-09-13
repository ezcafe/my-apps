/**
 * Caregiver local calendar day as a HALF-OPEN window:
 * from = local midnight, to = next local midnight, both ISO with offset.
 * dayKey is YYYY-MM-DD in local time. Same dayKey → same from/to.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function localOffsetIso(d: Date): string {
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

function localMidnightParts(now: Date): {
  year: number;
  month: number;
  day: number;
} {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function dateAtLocalMidnight(
  year: number,
  month: number,
  day: number,
): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function toOffsetIso(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const h = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  const s = pad2(d.getSeconds());
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${y}-${m}-${day}T${h}:${min}:${s}.${ms}${localOffsetIso(d)}`;
}

export function babyLocalDayWindow(now: Date): {
  from: string;
  to: string;
  dayKey: string;
} {
  const { year, month, day } = localMidnightParts(now);
  const fromDate = dateAtLocalMidnight(year, month, day);
  const toDate = dateAtLocalMidnight(year, month, day + 1);
  return {
    from: toOffsetIso(fromDate),
    to: toOffsetIso(toDate),
    dayKey: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

/**
 * Milliseconds until the next local midnight, from calendar parts.
 * Floored at 1000 ms so a rollover timer never arms with 0.
 */
export function msUntilNextLocalMidnight(now: Date): number {
  const { year, month, day } = localMidnightParts(now);
  const next = dateAtLocalMidnight(year, month, day + 1);
  const ms = next.getTime() - now.getTime();
  return Math.max(1000, ms);
}

export type BabyLocalDayWindow = ReturnType<typeof babyLocalDayWindow>;

/** Same dayKey → null (no React state update / no refetch). */
export function nextBabyLocalDayIfChanged(
  prevDayKey: string,
  now: Date,
): BabyLocalDayWindow | null {
  const next = babyLocalDayWindow(now);
  return next.dayKey === prevDayKey ? null : next;
}

export type BabyLocalDayRollHost = {
  now: () => Date;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
  addVisibilityListener: (fn: () => void) => void;
  removeVisibilityListener: (fn: () => void) => void;
  addFocusListener: (fn: () => void) => void;
  removeFocusListener: (fn: () => void) => void;
};

/**
 * Midnight timer + visibility/focus wake — the day that owns
 * babyHomeQuickStatus must refresh after sleeping past midnight.
 * Returns dispose.
 */
export function attachBabyLocalDayRoll(
  onMaybeRoll: (now: Date) => void,
  host: BabyLocalDayRollHost,
): () => void {
  let timer: unknown;
  const roll = () => {
    const now = host.now();
    onMaybeRoll(now);
    host.clearTimeout(timer);
    timer = host.setTimeout(roll, msUntilNextLocalMidnight(now) + 1000);
  };
  timer = host.setTimeout(roll, msUntilNextLocalMidnight(host.now()) + 1000);
  const onWake = () => roll();
  host.addVisibilityListener(onWake);
  host.addFocusListener(onWake);
  return () => {
    host.clearTimeout(timer);
    host.removeVisibilityListener(onWake);
    host.removeFocusListener(onWake);
  };
}
