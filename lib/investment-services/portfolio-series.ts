import { and, eq } from "drizzle-orm";
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
import {
  computePortfolioValueSeries,
  type PortfolioLot,
} from "@/lib/investment-portfolio-value";
import { occurredAtToActivityDate } from "@/lib/money-investment-activity";
import {
  ensureDailyQuotesForRange,
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

  const instruments = await db
    .select()
    .from(investmentInstrument)
    .where(
      and(
        eq(investmentInstrument.workspaceId, workspaceId),
        eq(investmentInstrument.archived, 0),
      ),
    );

  const lots = await loadLots(workspaceId);

  await Promise.all(
    instruments
      .filter((inst) => inst.yahooSymbol)
      .map((inst) =>
        ensureDailyQuotesForRange(
          inst.id,
          inst.yahooSymbol!,
          inst.currency,
          from,
          to,
        ),
      ),
  );

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
    const rows = await db
      .select({
        date: investmentQuoteDaily.date,
        closePriceMinor: investmentQuoteDaily.closePriceMinor,
      })
      .from(investmentQuoteDaily)
      .where(eq(investmentQuoteDaily.instrumentId, inst.id))
      .orderBy(investmentQuoteDaily.date);
    dailyByInst.set(inst.id, rows);
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

export async function investmentHoldingsSnapshot(workspaceId: string) {
  const instruments = await db
    .select()
    .from(investmentInstrument)
    .where(
      and(
        eq(investmentInstrument.workspaceId, workspaceId),
        eq(investmentInstrument.archived, 0),
      ),
    );
  const lots = await loadLots(workspaceId);
  const quotes = await getLatestQuotesForInstruments(instruments.map((i) => i.id));
  const quoteMap = new Map(quotes.map((q) => [q.instrumentId, q]));

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
