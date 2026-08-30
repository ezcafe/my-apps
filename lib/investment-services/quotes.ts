import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
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

const QUOTE_REFRESH_COOLDOWN_MS = 60_000;
const FX_CACHE_TTL_MS = 5 * 60_000;
const MAX_WORKSPACE_REFRESH_CACHE = 1_000;
const MAX_FX_CACHE = 500;

const workspaceRefreshAt = new Map<string, number>();
const fxCache = new Map<
  string,
  {
    expiresAt: number;
    value: {
      rate: number;
      sourceSymbol: string;
      inverted: boolean;
      asOf: string;
    } | null;
  }
>();

function setWorkspaceRefresh(workspaceId: string, timestamp: number) {
  if (workspaceRefreshAt.size >= MAX_WORKSPACE_REFRESH_CACHE) {
    const cutoff = Date.now() - QUOTE_REFRESH_COOLDOWN_MS * 5;
    for (const [k, v] of workspaceRefreshAt) {
      if (v < cutoff) workspaceRefreshAt.delete(k);
    }
    if (workspaceRefreshAt.size >= MAX_WORKSPACE_REFRESH_CACHE) {
      workspaceRefreshAt.clear();
    }
  }
  workspaceRefreshAt.set(workspaceId, timestamp);
}

function setFxCache(
  cacheKey: string,
  entry: {
    expiresAt: number;
    value: {
      rate: number;
      sourceSymbol: string;
      inverted: boolean;
      asOf: string;
    } | null;
  },
) {
  if (fxCache.size >= MAX_FX_CACHE) {
    const now = Date.now();
    for (const [k, v] of fxCache) {
      if (v.expiresAt <= now) fxCache.delete(k);
    }
    if (fxCache.size >= MAX_FX_CACHE) {
      fxCache.clear();
    }
  }
  fxCache.set(cacheKey, entry);
}

export async function refreshQuotesForWorkspace(workspaceId: string) {
  const last = workspaceRefreshAt.get(workspaceId) ?? 0;
  if (Date.now() - last < QUOTE_REFRESH_COOLDOWN_MS) {
    return { updated: 0, skipped: true as const };
  }
  setWorkspaceRefresh(workspaceId, Date.now());

  const instruments = await db
    .select()
    .from(investmentInstrument)
    .where(eq(investmentInstrument.workspaceId, workspaceId));

  const active = instruments.filter((i) => i.archived === 0 && i.yahooSymbol);
  const symbols = active.map((i) => i.yahooSymbol!);
  const quotes = await fetchYahooQuotes(symbols);

  const rows = active
    .map((inst) => {
      const q = quotes.get(inst.yahooSymbol!);
      if (!q) return null;
      return {
        instrumentId: inst.id,
        priceMinor: majorToMinor(q.priceMajor, inst.currency),
        asOf: q.asOf,
        source: "yahoo" as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  if (rows.length > 0) {
    await db
      .insert(investmentQuote)
      .values(rows)
      .onConflictDoUpdate({
        target: investmentQuote.instrumentId,
        set: {
          priceMinor: sql`excluded.price_minor`,
          asOf: sql`excluded.as_of`,
          source: sql`excluded.source`,
        },
      });
  }

  return { updated: rows.length, skipped: false as const };
}

export async function refreshAllWorkspaceQuotesCron() {
  const instruments = await listActiveMarketInstruments();
  const bySymbol = new Map<string, typeof instruments>();
  for (const i of instruments) {
    if (!i.yahooSymbol) continue;
    const list = bySymbol.get(i.yahooSymbol) ?? [];
    list.push(i);
    bySymbol.set(i.yahooSymbol, list);
  }
  const quotes = await fetchYahooQuotes([...bySymbol.keys()]);
  const rows: {
    instrumentId: string;
    priceMinor: number;
    asOf: Date;
    source: "yahoo";
  }[] = [];
  for (const [symbol, insts] of bySymbol) {
    const q = quotes.get(symbol);
    if (!q) continue;
    for (const inst of insts) {
      rows.push({
        instrumentId: inst.id,
        priceMinor: majorToMinor(q.priceMajor, inst.currency),
        asOf: q.asOf,
        source: "yahoo",
      });
    }
  }
  if (rows.length > 0) {
    // Chunk to avoid oversized statements.
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await db
        .insert(investmentQuote)
        .values(chunk)
        .onConflictDoUpdate({
          target: investmentQuote.instrumentId,
          set: {
            priceMinor: sql`excluded.price_minor`,
            asOf: sql`excluded.as_of`,
            source: sql`excluded.source`,
          },
        });
    }
  }
  return { updated: rows.length };
}

export async function backfillDailyQuotes(
  instrumentId: string,
  yahooSymbol: string,
  currency: string,
  from: string,
  to: string,
) {
  const hist = await fetchYahooHistoricalCloses(yahooSymbol, from, to);
  if (hist.length === 0) return;
  const rows = hist.map((h) => ({
    instrumentId,
    date: h.date,
    closePriceMinor: majorToMinor(h.closeMajor, currency),
  }));
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await db
      .insert(investmentQuoteDaily)
      .values(chunk)
      .onConflictDoUpdate({
        target: [investmentQuoteDaily.instrumentId, investmentQuoteDaily.date],
        set: { closePriceMinor: sql`excluded.close_price_minor` },
      });
  }
}

/** Fetch Yahoo history for instruments in range that have fewer than 3 stored daily closes. */
export async function ensureDailyQuotesForInstruments(
  instruments: Array<{ id: string; yahooSymbol?: string | null; currency: string }>,
  from: string,
  to: string,
) {
  const active = instruments.filter(
    (inst): inst is typeof inst & { yahooSymbol: string } =>
      Boolean(inst.yahooSymbol),
  );
  if (active.length === 0) return;

  const instrumentIds = active.map((i) => i.id);
  const counts = await db
    .select({
      instrumentId: investmentQuoteDaily.instrumentId,
      cnt: sql<number>`count(*)::int`,
    })
    .from(investmentQuoteDaily)
    .where(
      and(
        inArray(investmentQuoteDaily.instrumentId, instrumentIds),
        gte(investmentQuoteDaily.date, from),
        lte(investmentQuoteDaily.date, to),
      ),
    )
    .groupBy(investmentQuoteDaily.instrumentId);

  const countByInst = new Map(counts.map((c) => [c.instrumentId, c.cnt]));
  const missing = active.filter((inst) => (countByInst.get(inst.id) ?? 0) < 3);

  if (missing.length === 0) return;

  await Promise.all(
    missing.map((inst) =>
      backfillDailyQuotes(
        inst.id,
        inst.yahooSymbol,
        inst.currency,
        from,
        to,
      ),
    ),
  );
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
  return db
    .select()
    .from(investmentQuoteDaily)
    .where(
      and(
        eq(investmentQuoteDaily.instrumentId, instrumentId),
        gte(investmentQuoteDaily.date, from),
        lte(investmentQuoteDaily.date, to),
      ),
    )
    .orderBy(investmentQuoteDaily.date);
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
  const cacheKey = `${from}:${to}`;
  const cached = fxCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (from === to) {
    const value = {
      rate: 1,
      sourceSymbol: `${from}${to}=X`,
      inverted: false,
      asOf: new Date().toISOString(),
    };
    setFxCache(cacheKey, { expiresAt: Date.now() + FX_CACHE_TTL_MS, value });
    return value;
  }
  const direct = yahooFxSymbol(from, to);
  const inverse = yahooFxSymbol(to, from);
  const quotes = await fetchYahooQuotes([direct, inverse]);
  let value: {
    rate: number;
    sourceSymbol: string;
    inverted: boolean;
    asOf: string;
  } | null = null;
  const d = quotes.get(direct);
  if (d && d.priceMajor > 0) {
    value = {
      rate: d.priceMajor,
      sourceSymbol: direct,
      inverted: false,
      asOf: d.asOf.toISOString(),
    };
  } else {
    const inv = quotes.get(inverse);
    if (inv && inv.priceMajor > 0) {
      value = {
        rate: 1 / inv.priceMajor,
        sourceSymbol: inverse,
        inverted: true,
        asOf: inv.asOf.toISOString(),
      };
    }
  }
  setFxCache(cacheKey, { expiresAt: Date.now() + FX_CACHE_TTL_MS, value });
  return value;
}
