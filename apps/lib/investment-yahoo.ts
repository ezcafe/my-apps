type InstrumentKind = "stocks" | "coins" | "fx";

/** Minor units per 1 unit of asset (e.g. USD cents). */
export function majorToMinor(major: number, currency = "USD"): number {
  void currency;
  return Math.round(major * 100);
}

export function minorToMajor(minor: number): number {
  return minor / 100;
}

export function defaultYahooSymbol(
  kind: InstrumentKind,
  symbol: string,
  currency: string,
): string {
  const s = symbol.trim().toUpperCase();
  if (kind === "stocks") return s;
  if (kind === "coins") {
    if (s.includes("-")) return s;
    return `${s}-${currency.toUpperCase()}`;
  }
  if (kind === "fx") {
    if (s.includes("=")) return s;
    return `${s}=X`;
  }
  return s;
}

export type YahooQuoteResult = {
  symbol: string;
  priceMajor: number;
  currency: string;
  asOf: Date;
};

async function getYahooFinance() {
  const YahooFinance = (await import("yahoo-finance2")).default;
  return new YahooFinance();
}

export async function fetchYahooQuotes(
  symbols: string[],
): Promise<Map<string, YahooQuoteResult>> {
  const unique = [...new Set(symbols.filter(Boolean))];
  const out = new Map<string, YahooQuoteResult>();
  if (unique.length === 0) return out;

  const yf = await getYahooFinance();
  for (const symbol of unique) {
    try {
      const q = await yf.quote(symbol);
      if (!q || typeof q !== "object") continue;
      const price =
        typeof q.regularMarketPrice === "number"
          ? q.regularMarketPrice
          : null;
      if (price == null) continue;
      out.set(symbol, {
        symbol,
        priceMajor: price,
        currency: String(q.currency ?? "USD"),
        asOf: new Date(),
      });
    } catch {
      /* skip failed symbol */
    }
  }
  return out;
}

/** v2 package ships quote only; daily history is optional/backfill no-op until chart module is enabled. */
export async function fetchYahooHistoricalCloses(
  symbol: string,
  from: string,
  to: string,
): Promise<{ date: string; closeMajor: number }[]> {
  void symbol;
  void from;
  void to;
  return [];
}
