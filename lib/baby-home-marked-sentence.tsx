import { createElement, type ReactNode } from "react";

/** Bold facts for 3AM scan — not accent/link styling. */
export const BABY_HOME_EMPHASIS_CLASS =
  "font-medium text-foreground tabular-nums";

/** Glue words stay quieter. */
export const BABY_HOME_QUIET_CLASS = "text-muted font-normal";

export function fillBabyHomeTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}

/**
 * Render a string where «facts» are emphasized and the rest is muted.
 * Fill {placeholders} before calling when needed.
 */
export function renderBabyHomeMarkedSentence(marked: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /«([^»]*)»/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(marked)) !== null) {
    if (match.index > last) {
      parts.push(
        createElement(
          "span",
          { key: `q${i}`, className: BABY_HOME_QUIET_CLASS },
          marked.slice(last, match.index),
        ),
      );
    }
    parts.push(
      createElement(
        "strong",
        { key: `e${i}`, className: BABY_HOME_EMPHASIS_CLASS },
        match[1],
      ),
    );
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < marked.length) {
    parts.push(
      createElement(
        "span",
        { key: `q${i}`, className: BABY_HOME_QUIET_CLASS },
        marked.slice(last),
      ),
    );
  }
  return parts.length === 1 ? parts[0]! : createElement("span", null, ...parts);
}

function isPumpMethod(method: string | undefined): boolean {
  return (
    method === "pump" || method === "pump_l" || method === "pump_r"
  );
}

function isFeedMethod(method: string | undefined): boolean {
  return (
    method === "breast_l" ||
    method === "breast_r" ||
    method === "formula"
  );
}

function joinMarkedBits(bits: string[], andWord: string): string {
  if (bits.length === 1) return bits[0]!;
  if (bits.length === 2) return `${bits[0]} ${andWord} ${bits[1]}`;
  return `${bits.slice(0, -1).join(", ")}, ${andWord} ${bits[bits.length - 1]}`;
}

/**
 * Feed status detail — breast + bottle only (never pump).
 * Pump belongs on the separate last-pump status line.
 */
export function babyHomeFeedDetailMarked(input: {
  summary: string;
  payload: unknown;
  t: (key: string) => string;
}): string {
  const payload = input.payload as {
    method?: string;
    amountMl?: number;
    legs?: Array<{ method?: string; amountMl?: number | null }>;
  } | null;

  const bottleOf = (ml: number | string) =>
    fillBabyHomeTemplate(input.t("home.status.detail.bottle"), { ml: String(ml) });
  const breastLeft = input.t("home.status.detail.breastLeft");
  const breastRight = input.t("home.status.detail.breastRight");
  const andWord = input.t("home.status.detail.and");

  const legs = Array.isArray(payload?.legs) ? payload.legs : null;
  if (legs && legs.length > 0) {
    const bits: string[] = [];
    let sawBreast = false;
    for (const leg of legs) {
      if (leg.method === "breast_l") {
        bits.push(breastLeft);
        sawBreast = true;
      } else if (leg.method === "breast_r") {
        bits.push(breastRight);
        sawBreast = true;
      } else if (
        leg.method === "formula" &&
        leg.amountMl != null &&
        Number.isFinite(leg.amountMl)
      ) {
        bits.push(bottleOf(leg.amountMl));
      }
      // pump_* / pump amount legs → omitted (pump status line)
    }
    if (bits.length > 0) return joinMarkedBits(bits, andWord);
    if (sawBreast) return input.t("home.status.detail.breast");
  }

  const method = payload?.method;
  if (isPumpMethod(method)) {
    return "";
  }
  const ml = payload?.amountMl;
  if (method === "formula" && ml != null && Number.isFinite(ml)) {
    return bottleOf(ml);
  }
  if (method === "breast_l") return breastLeft;
  if (method === "breast_r") return breastRight;

  const formula = input.summary.match(/Formula\s+(\d+)\s*ml/i);
  if (formula) return bottleOf(formula[1]!);
  if (/Breast L/i.test(input.summary)) return breastLeft;
  if (/Breast R/i.test(input.summary)) return breastRight;
  if (/Pump/i.test(input.summary) && !/Breast|Formula/i.test(input.summary)) {
    return "";
  }

  return `«${input.summary}»`;
}

/** Pump status detail — pump family only (never breast/bottle). */
export function babyHomePumpDetailMarked(input: {
  summary: string;
  payload: unknown;
  t: (key: string) => string;
}): string {
  const payload = input.payload as {
    method?: string;
    amountMl?: number;
    legs?: Array<{ method?: string; amountMl?: number | null }>;
  } | null;

  const andWord = input.t("home.status.detail.and");
  const pump = input.t("home.status.detail.pump");
  const legs = Array.isArray(payload?.legs) ? payload.legs : null;
  if (legs && legs.length > 0) {
    const bits: string[] = [];
    for (const leg of legs) {
      if (leg.method === "pump_l") {
        bits.push(input.t("home.status.detail.pumpL"));
      } else if (leg.method === "pump_r") {
        bits.push(input.t("home.status.detail.pumpR"));
      } else if (
        leg.method === "pump" &&
        leg.amountMl != null &&
        Number.isFinite(leg.amountMl)
      ) {
        bits.push(
          fillBabyHomeTemplate(input.t("home.status.detail.pumpAmount"), {
            ml: String(leg.amountMl),
          }),
        );
      }
    }
    if (bits.length > 0) return joinMarkedBits(bits, andWord);
  }

  const method = payload?.method;
  const ml = payload?.amountMl;
  if (method === "pump_l") return input.t("home.status.detail.pumpL");
  if (method === "pump_r") return input.t("home.status.detail.pumpR");
  if (method === "pump" && ml != null && Number.isFinite(ml)) {
    return fillBabyHomeTemplate(input.t("home.status.detail.pumpAmount"), {
      ml: String(ml),
    });
  }
  if (isPumpMethod(method)) return pump;
  if (isFeedMethod(method)) return pump;

  return `«${input.summary}»`;
}

export function babyHomeDiaperDetailMarked(input: {
  summary: string;
  payload: unknown;
  t: (key: string) => string;
}): string {
  const kind = (input.payload as { kind?: string } | null)?.kind;
  const map: Record<string, string> = {
    wet: input.t("home.status.detail.diaperWet"),
    dirty: input.t("home.status.detail.diaperPoop"),
    mixed: input.t("home.status.detail.diaperMixed"),
    dry: input.t("home.status.detail.diaperDry"),
  };
  if (kind && map[kind]) return map[kind]!;

  const fromSummary = input.summary.match(
    /Diaper\s*\((Wet|Poop|Dirty|Mixed|Dry)\)/i,
  );
  if (fromSummary) {
    const raw = fromSummary[1]!.toLowerCase();
    if (raw === "dirty" || raw === "poop") {
      return input.t("home.status.detail.diaperPoop");
    }
    if (raw === "wet") return input.t("home.status.detail.diaperWet");
    if (raw === "mixed") return input.t("home.status.detail.diaperMixed");
    if (raw === "dry") return input.t("home.status.detail.diaperDry");
  }
  return `«${input.summary}»`;
}
