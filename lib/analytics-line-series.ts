/** Helpers for analytics net cumulative flow (calendar month fill + compare). */

export type RawCumulativeLineRow = {
  date: string;
  cumulativeExpense: number;
  cumulativeIncome: number;
};

export type NetFlowPoint = {
  date: string;
  netMinor: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** First and last calendar day of the current local month. */
export function currentCalendarMonthBounds(): {
  fromDate: string;
  toDate: string;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fromDate = `${y}-${pad2(m + 1)}-01`;
  const last = new Date(y, m + 1, 0);
  const toDate = formatLocalDate(last);
  return { fromDate, toDate };
}

/** Filter spans the current calendar month (starts on the 1st; end within this month). */
export function isCurrentCalendarMonthRange(
  fromDate: string,
  toDate: string,
): boolean {
  const { fromDate: monthStart, toDate: monthEnd } =
    currentCalendarMonthBounds();
  return (
    fromDate === monthStart && toDate >= monthStart && toDate <= monthEnd
  );
}

export function calendarMonthDateRange(
  year: number,
  monthIndex: number,
): { fromDate: string; toDate: string; days: string[] } {
  const fromDate = `${year}-${pad2(monthIndex + 1)}-01`;
  const last = new Date(year, monthIndex + 1, 0);
  const toDate = formatLocalDate(last);
  const days: string[] = [];
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(`${year}-${pad2(monthIndex + 1)}-${pad2(d)}`);
  }
  return { fromDate, toDate, days };
}

export function previousCalendarMonth(fromDate: string): {
  fromDate: string;
  toDate: string;
  days: string[];
} {
  const [y, mo] = fromDate.split("-").map(Number);
  // `mo` from YYYY-MM-DD is 1-based (5 = May); calendarMonthDateRange uses 0-based index.
  const monthIndex = mo! - 1;
  const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? y! - 1 : y!;
  return calendarMonthDateRange(prevYear, prevMonthIndex);
}

export function isoBoundsToLocalDates(
  fromISO: string,
  toISO: string,
): { fromDate: string; toDate: string } {
  return {
    fromDate: formatLocalDate(new Date(fromISO)),
    toDate: formatLocalDate(new Date(toISO)),
  };
}

/** Day-of-month key (1–31) for aligned month-over-month charts. */
export function dayOfMonthKey(isoDate: string): string {
  const day = Number(isoDate.split("-")[2]);
  return String(day);
}

/**
 * Forward-fill cumulative expense/income for each calendar day, then net = income − expense.
 * Stops after `endDateInclusive` when set.
 */
export function fillDailyCumulativeNet(
  raw: RawCumulativeLineRow[],
  days: string[],
  endDateInclusive?: string,
): NetFlowPoint[] {
  const byDate = new Map(raw.map((r) => [r.date, r]));
  let lastExp = 0;
  let lastInc = 0;
  const result: NetFlowPoint[] = [];

  for (const day of days) {
    if (endDateInclusive && day > endDateInclusive) break;
    const row = byDate.get(day);
    if (row) {
      lastExp = row.cumulativeExpense;
      lastInc = row.cumulativeIncome;
    }
    result.push({ date: day, netMinor: lastInc - lastExp });
  }

  return result;
}

/** Map net points to day-of-month keys for overlay charts. */
export function netPointsByDayOfMonth(points: NetFlowPoint[]): NetFlowPoint[] {
  return points.map((p) => ({
    date: dayOfMonthKey(p.date),
    netMinor: p.netMinor,
  }));
}

/** End date for in-progress current month: min(today, filter toDate). */
export function currentMonthSeriesEndDate(filterToDate: string): string {
  const today = formatLocalDate(new Date());
  return filterToDate < today ? filterToDate : today;
}
