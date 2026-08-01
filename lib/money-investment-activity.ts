export type MoneyInvestmentActivityType =
  | "buy"
  | "sell"
  | "dividend"
  | "fee"
  | "adjustment"
  | "deposit"
  | "withdraw";

export function investmentActivityTypeToTransactionKind(
  type: MoneyInvestmentActivityType,
): "expense" | "income" {
  switch (type) {
    case "buy":
    case "fee":
    case "withdraw":
      return "expense";
    case "sell":
    case "dividend":
    case "deposit":
      return "income";
    case "adjustment":
      return "expense";
    default:
      return "expense";
  }
}

export function activityDateToOccurredAt(activityDate: string): Date {
  const trimmed = activityDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00.000Z`);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid activity date");
  }
  return parsed;
}

export function occurredAtToActivityDate(occurredAt: Date | string): string {
  const d = typeof occurredAt === "string" ? new Date(occurredAt) : occurredAt;
  return d.toISOString().slice(0, 10);
}
