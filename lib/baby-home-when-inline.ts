import {
  babyCareWhenParts,
  type BabyCareWhenParts,
} from "@/lib/baby-format-care-when";

function fill(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}

/** Mid-sentence “when” for home status (lowercase / about …). */
export function formatBabyHomeWhenInline(
  iso: string,
  t: (key: string) => string,
  now: Date = new Date(),
  locale: "en" | "vi" = "en",
): string {
  const parts = babyCareWhenParts(iso, now, locale);
  if (!parts) return "";
  return formatBabyHomeWhenPartsInline(parts, t);
}

export function formatBabyHomeWhenPartsInline(
  parts: BabyCareWhenParts,
  t: (key: string) => string,
): string {
  switch (parts.kind) {
    case "justNow":
      return t("home.whenJustNow.inline");
    case "minutes":
      return fill(t("home.whenMinutes.inline"), { n: parts.count });
    case "hours":
      return fill(t("home.whenHours.inline"), { n: parts.count });
    case "yesterday":
      return fill(t("home.whenYesterday.inline"), { time: parts.time });
    case "weekday":
      return fill(t("home.whenWeekday.inline"), {
        weekday: parts.weekday,
        time: parts.time,
      });
    case "date":
      return fill(t("home.whenDate.inline"), {
        date: parts.dateLabel,
        time: parts.time,
      });
  }
}
