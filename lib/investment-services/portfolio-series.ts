import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { workspace } from "@/db/schema/workspace";
import {
  investmentInstrument,
  investmentQuoteDaily,
  investmentTradeJournal,
} from "@/db/schema/investment";
import { parseQuantity } from "@/lib/investment-services/positions";
import {
  holdingValueMinor,
  parseContractSize,
} from "@/lib/investment-contract-size";
import { parsePriceMajor } from "@/lib/investment-realized-pnl";
import { getCurrencyFractionDigits } from "@/lib/format-money";
import {
  computePortfolioValueSeries,
  type PortfolioLot,
} from "@/lib/investment-portfolio-value";
import { tradeGrossPnlMinor } from "@/lib/investment-realized-pnl";
import {
  allocationByKind,
  closedTradeHitRate,
  maxDrawdownMinor,
  openLotsCount,
  pnlBySymbol,
  realizedPnlMinor,
} from "@/lib/investment-insights";
import { occurredAtToActivityDate } from "@/lib/money-investment-activity";
import { dateRangeParams } from "@/lib/analytics-build-query";
import { computeMoneyAnalyticsSummary } from "@/lib/money-services/analytics";
import {
  ensureDailyQuotesForInstruments,
  fetchInvestmentFxRate,
  getLatestQuotesForInstruments,
} from "@/lib/investment-services/quotes";

async function loadLots(workspaceId: string): Promise<PortfolioLot[]> {
  const rows = await db
    .select({
      instrumentId: investmentTradeJournal.instrumentId,
      activityType: investmentTradeJournal.activityType,
      quantity: investmentTradeJournal.quantity,
      openPrice: investmentTradeJournal.openPrice,
      activityDate: investmentTradeJournal.activityDate,
      status: investmentTradeJournal.status,
      closedAt: investmentTradeJournal.closedAt,
      realizedPnlMinor: investmentTradeJournal.realizedPnlMinor,
    })
    .from(investmentTradeJournal)
    .where(eq(investmentTradeJournal.workspaceId, workspaceId));

  return rows.map((row) => ({
    instrumentId: row.instrumentId,
    side: row.activityType,
    quantity: parseQuantity(row.quantity),
    openPrice: parsePriceMajor(row.openPrice) ?? 0,
    openDate: row.activityDate,
    closeDate:
      row.status === "closed" && row.closedAt
        ? occurredAtToActivityDate(row.closedAt)
        : null,
    realizedPnlMinor: row.realizedPnlMinor ?? 0,
  }));
}

export async function investmentPortfolioValueSeries(
  workspaceId: string,
  from: string,
  to: string,
): Promise<{ date: string; totalMinor: number }[]> {
  const [ws] = await db
    .select({ defaultCurrency: workspace.defaultCurrency })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);
  const workspaceCurrency = (ws?.defaultCurrency ?? "USD").toUpperCase();

  const instruments = await loadInstruments(workspaceId);

  const lots = await loadLots(workspaceId);

  await ensureDailyQuotesForInstruments(instruments, from, to);

  const instrumentIds = instruments.map((i) => i.id);
  const latestQuotes = await getLatestQuotesForInstruments(instrumentIds);
  const latestByInst = new Map(
    latestQuotes.map((q) => [q.instrumentId, q.priceMinor]),
  );

  const dailyByInst = new Map<
    string,
    { date: string; closePriceMinor: number }[]
  >();
  for (const inst of instruments) {
    dailyByInst.set(inst.id, []);
  }
  if (instrumentIds.length > 0) {
    const dailyRows = await db
      .select({
        instrumentId: investmentQuoteDaily.instrumentId,
        date: investmentQuoteDaily.date,
        closePriceMinor: investmentQuoteDaily.closePriceMinor,
      })
      .from(investmentQuoteDaily)
      .where(
        and(
          inArray(investmentQuoteDaily.instrumentId, instrumentIds),
          gte(investmentQuoteDaily.date, from),
          lte(investmentQuoteDaily.date, to),
        ),
      )
      .orderBy(investmentQuoteDaily.date);

    for (const row of dailyRows) {
      dailyByInst.get(row.instrumentId)?.push({
        date: row.date,
        closePriceMinor: row.closePriceMinor,
      });
    }
  }

  const currencies = [
    ...new Set(instruments.map((i) => i.currency.toUpperCase())),
  ];
  const fxRateToWorkspace = new Map<string, number>();
  await Promise.all(
    currencies.map(async (ccy) => {
      if (ccy === workspaceCurrency) {
        fxRateToWorkspace.set(ccy, 1);
        return;
      }
      const fx = await fetchInvestmentFxRate(ccy, workspaceCurrency);
      if (fx) fxRateToWorkspace.set(ccy, fx.rate);
    }),
  );

  return computePortfolioValueSeries({
    from,
    to,
    lots,
    instruments: instruments.map((i) => ({
      id: i.id,
      contractSize: String(i.contractSize ?? "1"),
      currency: i.currency,
    })),
    dailyByInst,
    latestByInst,
    workspaceCurrency,
    fxRateToWorkspace,
  });
}

export type InvestmentInsightsAtfPayload = {
  range: { from: string; to: string };
  summary: {
    resultsMinor: number;
    openNotionalMinor: number;
    realizedPnlMinor: number;
    openLotsCount: number;
  };
  series: { date: string; totalMinor: number }[];
  allocation: { label: string; kind?: string; valueMinor: number }[];
};

export type InvestmentInsightsMorePayload = {
  realizedMinor: number;
  unrealizedMinor: number;
  maxDrawdownMinor: number;
  closedCount: number;
  winningClosedCount: number;
  pnlBySymbol: { symbol: string; label: string; valueMinor: number }[];
};

function minorToMajor(minor: number, currency: string): number {
  const scale = 10 ** getCurrencyFractionDigits(currency);
  return minor / scale;
}

function holdingsFromLots(
  instruments: Awaited<ReturnType<typeof loadInstruments>>,
  lots: PortfolioLot[],
  quoteMap: Map<string, { priceMinor: number; asOf: Date | null }>,
) {
  return instruments
    .map((inst) => {
      const qty = lots
        .filter((lot) => lot.instrumentId === inst.id && lot.closeDate == null)
        .reduce((sum, lot) => {
          const signed = lot.side === "sell" ? -lot.quantity : lot.quantity;
          return sum + signed;
        }, 0);
      const quote = quoteMap.get(inst.id);
      const priceMinor = quote?.priceMinor ?? 0;
      const valueMinor = holdingValueMinor(
        Math.abs(qty),
        parseContractSize(inst.contractSize),
        priceMinor,
      );
      return {
        instrumentId: inst.id,
        kind: inst.kind,
        name: inst.name,
        symbol: inst.symbol,
        currency: inst.currency,
        quantity: qty,
        priceMinor,
        valueMinor,
        quoteAsOf: quote?.asOf?.toISOString() ?? null,
      };
    })
    .filter((row) => row.quantity !== 0);
}

async function loadInstruments(workspaceId: string) {
  return db
    .select()
    .from(investmentInstrument)
    .where(
      and(
        eq(investmentInstrument.workspaceId, workspaceId),
        eq(investmentInstrument.archived, 0),
      ),
    );
}

export async function investmentHoldingsSnapshot(workspaceId: string) {
  const instruments = await loadInstruments(workspaceId);
  const lots = await loadLots(workspaceId);
  const quotes = await getLatestQuotesForInstruments(instruments.map((i) => i.id));
  const quoteMap = new Map(
    quotes.map((q) => [q.instrumentId, { priceMinor: q.priceMinor, asOf: q.asOf }]),
  );
  return holdingsFromLots(instruments, lots, quoteMap);
}

export async function investmentInsightsAtf(
  workspaceId: string,
  from: string,
  to: string,
): Promise<InvestmentInsightsAtfPayload> {
  const series = await investmentPortfolioValueSeries(workspaceId, from, to);
  const holdings = await investmentHoldingsSnapshot(workspaceId);
  const lots = await loadLots(workspaceId);
  const openNotionalMinor = holdings.reduce((sum, row) => sum + row.valueMinor, 0);
  const cashBounds = dateRangeParams(from, to);
  const cashSummary = await computeMoneyAnalyticsSummary(workspaceId, {
    from: cashBounds.from,
    to: cashBounds.to,
    accountTypes: ["investment"],
  });
  return {
    range: { from, to },
    summary: {
      resultsMinor: cashSummary.stats.netMinor,
      openNotionalMinor,
      realizedPnlMinor: realizedPnlMinor(lots),
      openLotsCount: openLotsCount(lots),
    },
    series,
    allocation: allocationByKind(holdings),
  };
}

export async function investmentInsightsMore(
  workspaceId: string,
  from: string,
  to: string,
): Promise<InvestmentInsightsMorePayload> {
  const [series, instruments, lots] = await Promise.all([
    investmentPortfolioValueSeries(workspaceId, from, to),
    loadInstruments(workspaceId),
    loadLots(workspaceId),
  ]);
  const quotes = await getLatestQuotesForInstruments(instruments.map((i) => i.id));
  const quoteMap = new Map(quotes.map((q) => [q.instrumentId, q]));

  let unrealizedMinor = 0;
  const pnlRows: { symbol: string; name: string; pnlMinor: number }[] = [];
  for (const inst of instruments) {
    let pnlMinor = 0;
    for (const lot of lots) {
      if (lot.instrumentId !== inst.id) continue;
      if (lot.closeDate != null) {
        pnlMinor += lot.realizedPnlMinor;
        continue;
      }
      const priceMinor = quoteMap.get(inst.id)?.priceMinor ?? 0;
      const u = tradeGrossPnlMinor({
        side: lot.side,
        lots: lot.quantity,
        contractSize: String(inst.contractSize ?? "1"),
        openPrice: lot.openPrice,
        closePrice: minorToMajor(priceMinor, inst.currency),
        currency: inst.currency,
      });
      pnlMinor += u;
      unrealizedMinor += u;
    }
    if (pnlMinor !== 0) {
      pnlRows.push({ symbol: inst.symbol, name: inst.name, pnlMinor });
    }
  }
  const hit = closedTradeHitRate(lots);
  return {
    realizedMinor: realizedPnlMinor(lots),
    unrealizedMinor,
    maxDrawdownMinor: maxDrawdownMinor(series),
    closedCount: hit.closedCount,
    winningClosedCount: hit.winningClosedCount,
    pnlBySymbol: pnlBySymbol(pnlRows),
  };
}
