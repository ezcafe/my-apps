/** Monday-first month grid for the custom-date popover. */

export type CalendarDayCell = {
  date: string;
  inMonth: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseLocalDateString(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

/** Monday = 0 … Sunday = 6 */
function mondayIndex(jsWeekday: number): number {
  return (jsWeekday + 6) % 7;
}

export function addCalendarMonths(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

/** 42 cells (6 weeks) covering `year` / `monthIndex` (0-based). */
export function calendarMonthCells(
  year: number,
  monthIndex: number,
): CalendarDayCell[] {
  const first = new Date(year, monthIndex, 1);
  const startOffset = mondayIndex(first.getDay());
  const start = new Date(year, monthIndex, 1 - startOffset);
  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      date: toLocalDateString(d),
      inMonth: d.getMonth() === monthIndex,
    });
  }
  return cells;
}

export const CALENDAR_WEEKDAY_LABELS = [
  "Mo",
  "Tu",
  "We",
  "Th",
  "Fr",
  "Sa",
  "Su",
] as const;
