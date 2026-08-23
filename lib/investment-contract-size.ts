import type { InvestmentInstrumentKind } from "@/lib/investment-instrument-kind";

export type { InvestmentInstrumentKind };

/** IC Markets-style units per 1.00 lot. */
export function defaultContractSize(
  kind: InvestmentInstrumentKind,
  symbol: string,
): string {
  const s = symbol.trim().toUpperCase();
  if (s.startsWith("XAU")) return "100";
  if (s.startsWith("XAG")) return "1000";
  if (kind === "stocks" || kind === "coins" || kind === "commodities") return "1";
  if (kind === "fx") return "100000";
  return "1";
}

export function parseContractSize(value: string | number | null | undefined): number {
  if (value == null || value === "") return 1;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function holdingValueMinor(
  qtyLots: number,
  contractSize: number,
  priceMinor: number,
): number {
  return Math.round(qtyLots * contractSize * priceMinor);
}
