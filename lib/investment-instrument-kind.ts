export const INVESTMENT_INSTRUMENT_KINDS = [
  "stocks",
  "fx",
  "coins",
  "commodities",
] as const;

export type InvestmentInstrumentKind =
  (typeof INVESTMENT_INSTRUMENT_KINDS)[number];

export function isInvestmentInstrumentKind(
  value: string,
): value is InvestmentInstrumentKind {
  return (INVESTMENT_INSTRUMENT_KINDS as readonly string[]).includes(value);
}

export function investmentInstrumentKindLabel(kind: string): string {
  if (kind === "stocks") return "Stocks";
  if (kind === "fx") return "Fx";
  if (kind === "coins") return "Coins";
  if (kind === "commodities") return "Commodities";
  return kind;
}
