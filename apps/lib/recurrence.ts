export type MoneyCadence =
  | "every_5_minutes"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export const RECURRENCE_FORM_CADENCES = ["daily", "monthly", "yearly"] as const;
export const DEV_RECURRENCE_FORM_CADENCES = ["every_5_minutes"] as const;

export type RecurrenceFormCadence =
  | (typeof RECURRENCE_FORM_CADENCES)[number]
  | (typeof DEV_RECURRENCE_FORM_CADENCES)[number];

export function isDevOnlyRecurrenceCadence(
  cadence: string,
): cadence is (typeof DEV_RECURRENCE_FORM_CADENCES)[number] {
  return (DEV_RECURRENCE_FORM_CADENCES as readonly string[]).includes(cadence);
}

export function recurrenceCadenceAllowedInCurrentEnv(cadence: string): boolean {
  if (isDevOnlyRecurrenceCadence(cadence)) {
    return process.env.NODE_ENV !== "production";
  }
  return true;
}

export function getRecurrenceFormCadences(): readonly RecurrenceFormCadence[] {
  if (process.env.NODE_ENV === "development") {
    return [...RECURRENCE_FORM_CADENCES, ...DEV_RECURRENCE_FORM_CADENCES];
  }
  return RECURRENCE_FORM_CADENCES;
}

const CADENCE_LABELS: Record<MoneyCadence, string> = {
  every_5_minutes: "Every 5 minutes (dev)",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function cadenceLabel(cadence: MoneyCadence | string): string {
  return CADENCE_LABELS[cadence as MoneyCadence] ?? cadence;
}

export function addCadence(d: Date, cadence: MoneyCadence): Date {
  const next = new Date(d.getTime());
  switch (cadence) {
    case "every_5_minutes":
      next.setUTCMinutes(next.getUTCMinutes() + 5);
      break;
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "biweekly":
      next.setUTCDate(next.getUTCDate() + 14);
      break;
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case "quarterly":
      next.setUTCMonth(next.getUTCMonth() + 3);
      break;
    case "yearly":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
    default:
      next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}
