import type { InvestmentInstrumentKind } from "@/lib/investment-instrument-kind";

/** Minor units per 1 unit of asset (e.g. USD cents). */
export function majorToMinor(major: number, currency = "USD"): number {
  void currency;
  return Math.round(major * 100);
}

export function minorToMajor(minor: number): number {
  return minor / 100;
}

export function defaultYahooSymbol(
  kind: InvestmentInstrumentKind,
  symbol: string,
  currency: string,
): string {
  const s = symbol.trim().toUpperCase();
  if (kind === "stocks" || kind === "commodities") return s;
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

type YahooFinanceClient = InstanceType<
  typeof import("yahoo-finance2").default
>;

let yahooFinancePromise: Promise<YahooFinanceClient> | null = null;

/**
 * yahoo-finance2 v3+: default export is a class; construct once per process.
 * @see https://github.com/gadicc/yahoo-finance2/blob/dev/docs/UPGRADING.md
 */
async function getYahooFinance(): Promise<YahooFinanceClient> {
  if (!yahooFinancePromise) {
    yahooFinancePromise = import("yahoo-finance2").then(
      ({ default: YahooFinance }) =>
        new YahooFinance({
          suppressNotices: ["yahooSurvey"],
        }),
    );
  }
  return yahooFinancePromise;
}

function isoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchYahooQuotes(
  symbols: string[],
): Promise<Map<string, YahooQuoteResult>> {
  const unique = [...new Set(symbols.filter(Boolean))];
  const out = new Map<string, YahooQuoteResult>();
  if (unique.length === 0) return out;

  const yf = await getYahooFinance();
  try {
    const raw = await yf.quote(unique, {
      fields: ["symbol", "regularMarketPrice", "currency", "regularMarketTime"],
    });
    const quotes = Array.isArray(raw) ? raw : [raw];
    for (const q of quotes) {
      if (!q || typeof q !== "object") continue;
      const symbol = typeof q.symbol === "string" ? q.symbol : null;
      const price =
        typeof q.regularMarketPrice === "number"
          ? q.regularMarketPrice
          : null;
      if (!symbol || price == null) continue;
      out.set(symbol, {
        symbol,
        priceMajor: price,
        currency: String(q.currency ?? "USD"),
        asOf:
          q.regularMarketTime instanceof Date
            ? q.regularMarketTime
            : new Date(),
      });
    }
  } catch {
    /* skip batch failure */
  }
  return out;
}

/** Daily closes via yahoo-finance2 `historical` (available since v3+). */
export async function fetchYahooHistoricalCloses(
  symbol: string,
  from: string,
  to: string,
): Promise<{ date: string; closeMajor: number }[]> {
  const yf = await getYahooFinance();
  try {
    const rows = await yf.historical(symbol, {
      period1: from,
      period2: to,
      interval: "1d",
    });
    return rows
      .filter(
        (row): row is typeof row & { date: Date; close: number } =>
          row.date instanceof Date && typeof row.close === "number",
      )
      .map((row) => ({
        date: isoDateUtc(row.date),
        closeMajor:
          typeof row.adjClose === "number" ? row.adjClose : row.close,
      }));
  } catch {
    return [];
  }
}
