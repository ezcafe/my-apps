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

/** Human-readable lots/volume; strips PG numeric(24,8) trailing zeros. */
export function formatQuantityDisplay(
  value: string | number | null | undefined,
): string {
  if (value == null || value === "") return "";
  const raw =
    typeof value === "number"
      ? Number.isFinite(value)
        ? String(value)
        : ""
      : value.trim();
  if (!raw) return "";
  if (!raw.includes(".")) return raw;
  return raw.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
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
