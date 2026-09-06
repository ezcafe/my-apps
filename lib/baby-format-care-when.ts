/** Human-friendly "when" for last-care rows (pure; injectable now for tests). */

export type BabyCareWhenParts =
  | { kind: "justNow" }
  | { kind: "minutes"; count: number }
  | { kind: "hours"; count: number }
  | { kind: "yesterday"; time: string }
  | { kind: "weekday"; weekday: string; time: string }
  | { kind: "date"; dateLabel: string; time: string };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local 12h clock without seconds — easy to scan at 3am. */
export function formatBabyCareClock(d: Date): string {
  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

const WEEKDAYS_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAYS_VI = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
] as const;

const MONTHS_SHORT_EN = [
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

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Break an ISO timestamp into relative parts for i18n.
 * Locale only affects weekday/date labels for older events.
 */
export function babyCareWhenParts(
  iso: string,
  now: Date = new Date(),
  locale: "en" | "vi" = "en",
): BabyCareWhenParts | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;

  const diffMs = now.getTime() - at.getTime();
  if (diffMs < 0) {
    // Future clock skew — still show a short relative form.
    return { kind: "justNow" };
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return { kind: "justNow" };
  if (minutes < 60) return { kind: "minutes", count: minutes };

  const hours = Math.floor(minutes / 60);
  const dayMs = 24 * 60 * 60 * 1000;
  const dayDelta = startOfLocalDay(now) - startOfLocalDay(at);

  if (dayDelta === 0 && hours < 24) {
    return { kind: "hours", count: hours };
  }

  const time = formatBabyCareClock(at);
  if (dayDelta === dayMs) {
    return { kind: "yesterday", time };
  }

  if (dayDelta > dayMs && dayDelta < 7 * dayMs) {
    const weekday =
      locale === "vi" ? WEEKDAYS_VI[at.getDay()]! : WEEKDAYS_EN[at.getDay()]!;
    return { kind: "weekday", weekday, time };
  }

  const month = MONTHS_SHORT_EN[at.getMonth()]!;
  const dateLabel =
    locale === "vi"
      ? `${at.getDate()} ${month}`
      : `${month} ${at.getDate()}`;
  return { kind: "date", dateLabel, time };
}

function fill(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}

/** Turn parts + message lookup into one plain line. */
export function formatBabyCareWhen(
  iso: string,
  t: (key: string) => string,
  now: Date = new Date(),
  locale: "en" | "vi" = "en",
): string {
  const parts = babyCareWhenParts(iso, now, locale);
  if (!parts) return "";

  switch (parts.kind) {
    case "justNow":
      return t("home.whenJustNow");
    case "minutes":
      return fill(t("home.whenMinutes"), { n: parts.count });
    case "hours":
      return fill(t("home.whenHours"), { n: parts.count });
    case "yesterday":
      return fill(t("home.whenYesterday"), { time: parts.time });
    case "weekday":
      return fill(t("home.whenWeekday"), {
        weekday: parts.weekday,
        time: parts.time,
      });
    case "date":
      return fill(t("home.whenDate"), {
        date: parts.dateLabel,
        time: parts.time,
      });
  }
}
