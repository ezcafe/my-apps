type ActivityType =
  | "buy"
  | "sell"
  | "dividend"
  | "fee"
  | "adjustment"
  | "deposit"
  | "withdraw";

export function parseQuantity(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function quantityDelta(
  type: ActivityType,
  quantity: number,
): number {
  switch (type) {
    case "buy":
    case "deposit":
    case "adjustment":
      return quantity;
    case "sell":
    case "withdraw":
    case "fee":
      return -quantity;
    case "dividend":
      return 0;
    default:
      return 0;
  }
}

export function quantityAtDate(
  activities: { activityDate: string; type: ActivityType; quantity: string | null }[],
  asOf: string,
): number {
  let qty = 0;
  for (const a of activities) {
    if (a.activityDate > asOf) continue;
    qty += quantityDelta(a.type, parseQuantity(a.quantity));
  }
  return qty;
}
