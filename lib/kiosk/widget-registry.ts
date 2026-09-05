import { z } from "zod";

export const KIOSK_WIDGET_IDS = [
  "context.today_weather",
  "money.net_month",
  "loans.payments",
  "loans.summary",
  "investments.summary",
  "bills.summary",
  "savings.summary",
] as const;

export type KioskWidgetId = (typeof KIOSK_WIDGET_IDS)[number];

export const kioskWidgetIdSchema = z.enum(KIOSK_WIDGET_IDS);

export type KioskFeatureGroup =
  | "context"
  | "money"
  | "loans"
  | "investments"
  | "bills"
  | "savings";

export type KioskWidgetDefinition = {
  id: KioskWidgetId;
  label: string;
  description: string;
  feature: KioskFeatureGroup;
  defaultEnabled: boolean;
};

export const KIOSK_WIDGET_REGISTRY: KioskWidgetDefinition[] = [
  {
    id: "context.today_weather",
    label: "Today and weather",
    description: "Current weekday, date, and weather for your city.",
    feature: "context",
    defaultEnabled: true,
  },
  {
    id: "money.net_month",
    label: "Net money this month",
    description: "Income minus expenses for the current calendar month.",
    feature: "money",
    defaultEnabled: true,
  },
  {
    id: "loans.payments",
    label: "Loan payments due",
    description: "Overdue installments and upcoming due dates.",
    feature: "loans",
    defaultEnabled: true,
  },
  {
    id: "loans.summary",
    label: "Loan summary",
    description: "Remaining balance, monthly obligation, APR, and next due date.",
    feature: "loans",
    defaultEnabled: false,
  },
  {
    id: "investments.summary",
    label: "Investment summary",
    description: "Results, open notional, realized P&L, and open lots.",
    feature: "investments",
    defaultEnabled: false,
  },
  {
    id: "bills.summary",
    label: "Bills this month",
    description: "Bill expenses for the current calendar month.",
    feature: "bills",
    defaultEnabled: false,
  },
  {
    id: "savings.summary",
    label: "Savings activity",
    description: "Net activity on savings accounts this month.",
    feature: "savings",
    defaultEnabled: false,
  },
];

export const DEFAULT_KIOSK_WIDGETS: KioskWidgetId[] = KIOSK_WIDGET_REGISTRY.filter(
  (w) => w.defaultEnabled,
).map((w) => w.id);

const KIOSK_WIDGET_ID_SET = new Set<string>(KIOSK_WIDGET_IDS);

export function isKioskWidgetId(value: string): value is KioskWidgetId {
  return KIOSK_WIDGET_ID_SET.has(value);
}

/** Filter unknown ids, dedupe, and preserve registry order. */
export function normalizeKioskWidgets(input: readonly string[]): KioskWidgetId[] {
  const wanted = new Set(
    input.filter((id): id is KioskWidgetId => isKioskWidgetId(id)),
  );
  return KIOSK_WIDGET_REGISTRY.filter((w) => wanted.has(w.id)).map((w) => w.id);
}

/** Resolve stored prefs: null/undefined → defaults. */
export function resolveKioskWidgets(
  stored: readonly string[] | null | undefined,
): KioskWidgetId[] {
  if (stored == null) return [...DEFAULT_KIOSK_WIDGETS];
  return normalizeKioskWidgets(stored);
}

export function kioskWidgetDefinition(
  id: KioskWidgetId,
): KioskWidgetDefinition | undefined {
  return KIOSK_WIDGET_REGISTRY.find((w) => w.id === id);
}

export const KIOSK_FEATURE_GROUP_LABELS: Record<KioskFeatureGroup, string> = {
  context: "Context",
  money: "Money",
  loans: "Loans",
  investments: "Investments",
  bills: "Bills",
  savings: "Savings",
};

export function kioskWidgetsByFeature(): Array<{
  feature: KioskFeatureGroup;
  label: string;
  widgets: KioskWidgetDefinition[];
}> {
  const groups = new Map<KioskFeatureGroup, KioskWidgetDefinition[]>();
  for (const widget of KIOSK_WIDGET_REGISTRY) {
    const list = groups.get(widget.feature) ?? [];
    list.push(widget);
    groups.set(widget.feature, list);
  }
  return (Object.keys(KIOSK_FEATURE_GROUP_LABELS) as KioskFeatureGroup[]).map(
    (feature) => ({
      feature,
      label: KIOSK_FEATURE_GROUP_LABELS[feature],
      widgets: groups.get(feature) ?? [],
    }),
  );
}
