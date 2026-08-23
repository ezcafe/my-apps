import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  investmentInstrument,
  investmentQuote,
  investmentQuoteDaily,
} from "@/db/schema/investment";
import {
  fetchYahooHistoricalCloses,
  fetchYahooQuotes,
  majorToMinor,
} from "@/lib/investment-yahoo";
import { yahooFxSymbol } from "@/lib/investment-fx";
import { listActiveMarketInstruments } from "@/lib/investment-services/instruments";

export async function refreshQuotesForWorkspace(workspaceId: string) {
  const instruments = await db
    .select()
    .from(investmentInstrument)
    .where(eq(investmentInstrument.workspaceId, workspaceId));

  const active = instruments.filter((i) => i.archived === 0 && i.yahooSymbol);
  const symbols = active.map((i) => i.yahooSymbol!);
  const quotes = await fetchYahooQuotes(symbols);

  for (const inst of active) {
    const q = quotes.get(inst.yahooSymbol!);
    if (!q) continue;
    await db
      .insert(investmentQuote)
      .values({
        instrumentId: inst.id,
        priceMinor: majorToMinor(q.priceMajor, inst.currency),
        asOf: q.asOf,
        source: "yahoo",
      })
      .onConflictDoUpdate({
        target: investmentQuote.instrumentId,
        set: {
          priceMinor: majorToMinor(q.priceMajor, inst.currency),
          asOf: q.asOf,
          source: "yahoo",
        },
      });
  }

  return { updated: active.length };
}

export async function refreshAllWorkspaceQuotesCron() {
  const instruments = await listActiveMarketInstruments();
  const bySymbol = new Map<string, string[]>();
  for (const i of instruments) {
    if (!i.yahooSymbol) continue;
    const list = bySymbol.get(i.yahooSymbol) ?? [];
    list.push(i.id);
    bySymbol.set(i.yahooSymbol, list);
  }
  const quotes = await fetchYahooQuotes([...bySymbol.keys()]);
  let updated = 0;
  for (const [symbol, ids] of bySymbol) {
    const q = quotes.get(symbol);
    if (!q) continue;
    for (const instrumentId of ids) {
      const inst = instruments.find((x) => x.id === instrumentId);
      if (!inst) continue;
      await db
        .insert(investmentQuote)
        .values({
          instrumentId,
          priceMinor: majorToMinor(q.priceMajor, inst.currency),
          asOf: q.asOf,
          source: "yahoo",
        })
        .onConflictDoUpdate({
          target: investmentQuote.instrumentId,
          set: {
            priceMinor: majorToMinor(q.priceMajor, inst.currency),
            asOf: q.asOf,
          },
        });
      updated += 1;
    }
  }
  return { updated };
}

export async function backfillDailyQuotes(
  instrumentId: string,
  yahooSymbol: string,
  currency: string,
  from: string,
  to: string,
) {
  const hist = await fetchYahooHistoricalCloses(yahooSymbol, from, to);
  for (const h of hist) {
    await db
      .insert(investmentQuoteDaily)
      .values({
        instrumentId,
        date: h.date,
        closePriceMinor: majorToMinor(h.closeMajor, currency),
      })
      .onConflictDoUpdate({
        target: [investmentQuoteDaily.instrumentId, investmentQuoteDaily.date],
        set: { closePriceMinor: majorToMinor(h.closeMajor, currency) },
      });
  }
}

/** Fetch Yahoo history when this range has almost no stored daily closes. */
export async function ensureDailyQuotesForRange(
  instrumentId: string,
  yahooSymbol: string,
  currency: string,
  from: string,
  to: string,
) {
  const existing = await db
    .select({ date: investmentQuoteDaily.date })
    .from(investmentQuoteDaily)
    .where(
      and(
        eq(investmentQuoteDaily.instrumentId, instrumentId),
        gte(investmentQuoteDaily.date, from),
        lte(investmentQuoteDaily.date, to),
      ),
    );
  if (existing.length >= 3) return;
  await backfillDailyQuotes(instrumentId, yahooSymbol, currency, from, to);
}

export async function getLatestQuotesForInstruments(instrumentIds: string[]) {
  if (instrumentIds.length === 0) return [];
  return db
    .select()
    .from(investmentQuote)
    .where(inArray(investmentQuote.instrumentId, instrumentIds));
}

export async function getDailyQuotesForRange(
  instrumentId: string,
  from: string,
  to: string,
) {
  void from;
  void to;
  return db
    .select()
    .from(investmentQuoteDaily)
    .where(eq(investmentQuoteDaily.instrumentId, instrumentId));
}

export async function fetchInvestmentFxRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<{
  rate: number;
  sourceSymbol: string;
  inverted: boolean;
  asOf: string;
} | null> {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();
  if (from === to) {
    return {
      rate: 1,
      sourceSymbol: `${from}${to}=X`,
      inverted: false,
      asOf: new Date().toISOString(),
    };
  }
  const direct = yahooFxSymbol(from, to);
  const inverse = yahooFxSymbol(to, from);
  const quotes = await fetchYahooQuotes([direct, inverse]);
  const d = quotes.get(direct);
  if (d && d.priceMajor > 0) {
    return {
      rate: d.priceMajor,
      sourceSymbol: direct,
      inverted: false,
      asOf: d.asOf.toISOString(),
    };
  }
  const inv = quotes.get(inverse);
  if (inv && inv.priceMajor > 0) {
    return {
      rate: 1 / inv.priceMajor,
      sourceSymbol: inverse,
      inverted: true,
      asOf: inv.asOf.toISOString(),
    };
  }
  return null;
}
