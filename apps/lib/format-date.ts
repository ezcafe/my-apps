"use client";

import { useMemo } from "react";
import {
  type DateFormat,
  usePreferences,
} from "@/components/preferences-provider";

export type { DateFormat };

export type FormatDisplayDateOptions = {
  omitYearIfCurrent?: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
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

function localeTag(format: DateFormat): string | undefined {
  if (format === "mdy") return "en-US";
  if (format === "dmy") return "en-GB";
  return undefined;
}

function formatYmdNumeric(d: Date, includeDay = true): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  if (!includeDay) return `${y}-${m}`;
  return `${y}-${m}-${pad2(d.getDate())}`;
}

function intlDate(
  d: Date,
  format: DateFormat,
  options: Intl.DateTimeFormatOptions,
): string {
  if (format === "ymd") {
    if (
      options.month === "short" &&
      options.day === undefined &&
      options.year === "numeric"
    ) {
      return formatYmdNumeric(d, false);
    }
    if (
      options.month === "short" &&
      options.day === "numeric" &&
      !options.year
    ) {
      return formatYmdNumeric(d);
    }
    return formatYmdNumeric(d);
  }
  return new Intl.DateTimeFormat(localeTag(format), options).format(d);
}

export function formatDisplayDate(
  input: string | Date,
  format: DateFormat,
  opts?: FormatDisplayDateOptions,
): string {
  const d = parseDateInput(input);
  if (!d) return typeof input === "string" ? input : "";

  const now = new Date();
  const omitYear =
    opts?.omitYearIfCurrent === true && d.getFullYear() === now.getFullYear();

  if (format === "ymd") {
    return formatYmdNumeric(d);
  }

  if (omitYear) {
    return intlDate(d, format, { month: "short", day: "numeric" });
  }

  return intlDate(d, format, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDisplayDateTime(
  input: string | Date,
  format: DateFormat,
): string {
  const d = parseDateInput(input);
  if (!d) return typeof input === "string" ? input : "";

  if (format === "ymd") {
    const date = formatYmdNumeric(d);
    const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    return `${date} ${time}`;
  }

  return new Intl.DateTimeFormat(localeTag(format), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
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

  if (format === "ymd") {
    return formatYmdNumeric(d, false);
  }

  return intlDate(d, format, { month: "long", year: "numeric" });
}

export function formatDisplayPeriod(
  fromIso: string,
  toIso: string,
  format: DateFormat,
): string {
  try {
    const from = parseDateInput(fromIso);
    const to = parseDateInput(toIso);
    if (!from || !to) return "";
    const sep = " – ";
    if (format === "ymd") {
      return `${formatYmdNumeric(from)}${sep}${formatYmdNumeric(to)}`;
    }
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    const tag = localeTag(format);
    return `${from.toLocaleDateString(tag, opts)}${sep}${to.toLocaleDateString(tag, opts)}`;
  } catch {
    return "";
  }
}

export function formatChartDateTick(isoDate: string, format: DateFormat): string {
  const parts = isoDate.split("-").map(Number);
  const [y, m, day] = parts;
  if (parts.length !== 3 || !y || !m || !day) return isoDate;
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return isoDate;

  if (format === "ymd") {
    return formatYmdNumeric(d);
  }

  return intlDate(d, format, { month: "short", day: "numeric" });
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
