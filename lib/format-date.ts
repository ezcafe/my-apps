"use client";

import { useMemo } from "react";
import {
  type DateFormat,
  usePreferences,
} from "@/components/preferences-provider";

export type { DateFormat };

export type FormatDisplayDateOptions = {
  /** Omit year when it matches the current calendar year. */
  omitYearIfCurrent?: boolean;
  /** Always omit the year (short month + day). */
  omitYear?: boolean;
  /** Show "Today" / "Yesterday" for those calendar days (local). */
  relativeDay?: boolean;
  /** Use a 2-digit year when the year is included (e.g. "7 Aug 25"). */
  shortYear?: boolean;
};

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function layoutOf(format: DateFormat): "mdy" | "dmy" | "ymd" {
  if (format === "dmy" || format === "ymd") return format;
  return "mdy";
}

/** Parse ISO date (`YYYY-MM-DD`) or datetime strings into a local Date. */
export function parseDateInput(input: string | Date): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const s = input.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatYmdNumeric(d: Date, includeDay = true): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  if (!includeDay) return `${y}-${m}`;
  return `${y}-${m}-${pad2(d.getDate())}`;
}

function formatYear(d: Date, shortYear: boolean): string {
  if (!shortYear) return String(d.getFullYear());
  return pad2(d.getFullYear() % 100);
}

function formatMdy(d: Date, opts: { omitYear: boolean; shortYear: boolean }): string {
  const month = MONTHS_SHORT[d.getMonth()]!;
  const day = String(d.getDate());
  if (opts.omitYear) return `${month} ${day}`;
  return `${month} ${day}, ${formatYear(d, opts.shortYear)}`;
}

function formatDmy(d: Date, opts: { omitYear: boolean; shortYear: boolean }): string {
  const month = MONTHS_SHORT[d.getMonth()]!;
  const day = String(d.getDate());
  if (opts.omitYear) return `${day} ${month}`;
  return `${day} ${month} ${formatYear(d, opts.shortYear)}`;
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatDisplayDate(
  input: string | Date,
  format: DateFormat,
  opts?: FormatDisplayDateOptions,
): string {
  const d = parseDateInput(input);
  if (!d) return typeof input === "string" ? input : "";

  const now = new Date();
  if (opts?.relativeDay) {
    const dayMs = 24 * 60 * 60 * 1000;
    const delta = startOfLocalDay(d) - startOfLocalDay(now);
    if (delta === 0) return "Today";
    if (delta === -dayMs) return "Yesterday";
  }

  const omitYear =
    opts?.omitYear === true ||
    (opts?.omitYearIfCurrent === true && d.getFullYear() === now.getFullYear());
  const shortYear = opts?.shortYear === true;
  const layout = layoutOf(format);

  if (layout === "ymd") {
    if (omitYear) return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    if (shortYear) {
      return `${pad2(d.getFullYear() % 100)}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
    return formatYmdNumeric(d);
  }

  if (layout === "dmy") return formatDmy(d, { omitYear, shortYear });
  return formatMdy(d, { omitYear, shortYear });
}

function formatTime12(d: Date): string {
  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

export function formatDisplayDateTime(
  input: string | Date,
  format: DateFormat,
): string {
  const d = parseDateInput(input);
  if (!d) return typeof input === "string" ? input : "";

  if (layoutOf(format) === "ymd") {
    return `${formatYmdNumeric(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  return `${formatDisplayDate(d, format)} ${formatTime12(d)}`;
}

export function formatDisplayMonthYear(
  yyyyMmOrDate: string,
  format: DateFormat,
): string {
  const parts = yyyyMmOrDate.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  if (!y || !m) return yyyyMmOrDate;
  const d = new Date(y, m - 1, 1);
  if (Number.isNaN(d.getTime())) return yyyyMmOrDate;

  if (layoutOf(format) === "ymd") {
    return formatYmdNumeric(d, false);
  }

  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDisplayPeriod(
  fromIso: string,
  toIso: string,
  format: DateFormat,
): string {
  const from = formatDisplayDate(fromIso, format);
  const to = formatDisplayDate(toIso, format);
  if (!from || !to) return "";
  return `${from} – ${to}`;
}

export function formatChartDateTick(isoDate: string, format: DateFormat): string {
  const parts = isoDate.split("-").map(Number);
  const [y, m, day] = parts;
  if (parts.length !== 3 || !y || !m || !day) return isoDate;
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return isoDate;

  return formatDisplayDate(d, format, { omitYear: true });
}

export function useFormatDate() {
  const { dateFormat } = usePreferences();

  return useMemo(
    () => ({
      dateFormat,
      formatDate: (
        input: string | Date,
        opts?: FormatDisplayDateOptions,
      ) => formatDisplayDate(input, dateFormat, opts),
      formatDateTime: (input: string | Date) =>
        formatDisplayDateTime(input, dateFormat),
      formatMonthYear: (yyyyMmOrDate: string) =>
        formatDisplayMonthYear(yyyyMmOrDate, dateFormat),
      formatPeriod: (fromIso: string, toIso: string) =>
        formatDisplayPeriod(fromIso, toIso, dateFormat),
      formatChartDateTick: (isoDate: string) =>
        formatChartDateTick(isoDate, dateFormat),
    }),
    [dateFormat],
  );
}

/** Sample previews for settings UI (fixed date 2026-05-15). */
export function dateFormatPreview(format: DateFormat): string {
  return formatDisplayDate("2026-05-15", format);
}
