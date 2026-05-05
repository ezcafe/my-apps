export type MoneyCadence =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export function addCadence(d: Date, cadence: MoneyCadence): Date {
  const next = new Date(d.getTime());
  switch (cadence) {
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
