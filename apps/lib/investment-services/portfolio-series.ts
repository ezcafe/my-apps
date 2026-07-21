import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { investmentInstrument, investmentQuoteDaily } from "@/db/schema/investment";
import { listWorkspaceInvestmentActivities } from "@/lib/investment-services/activities";
import { quantityAtDate } from "@/lib/investment-services/positions";
import { getLatestQuotesForInstruments } from "@/lib/investment-services/quotes";

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return dt.toISOString().slice(0, 10);
}

function priceOnDate(
  daily: { date: string; closePriceMinor: number }[],
  asOf: string,
  fallbackMinor: number,
): number {
  let last = fallbackMinor;
  for (const row of daily) {
    if (row.date > asOf) break;
    last = row.closePriceMinor;
  }
  return last;
}

export async function investmentPortfolioValueSeries(
  workspaceId: string,
  from: string,
  to: string,
): Promise<{ date: string; totalMinor: number }[]> {
  const instruments = await db
    .select()
    .from(investmentInstrument)
    .where(
      and(
        eq(investmentInstrument.workspaceId, workspaceId),
        eq(investmentInstrument.archived, 0),
      ),
    );

  const activities = await listWorkspaceInvestmentActivities(workspaceId);
  const instrumentIds = instruments.map((i) => i.id);
  const latestQuotes = await getLatestQuotesForInstruments(instrumentIds);
  const latestByInst = new Map(
    latestQuotes.map((q) => [q.instrumentId, q.priceMinor]),
  );

  const dailyByInst = new Map<string, { date: string; closePriceMinor: number }[]>();
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

  const instActivities = instruments.map((inst) => ({
    inst,
    acts: activities
      .filter((a) => a.instrumentId === inst.id)
      .map((a) => ({
        activityDate: a.activityDate,
        type: a.type,
        quantity: a.quantity,
      })),
  }));

  const out: { date: string; totalMinor: number }[] = [];
  let cursor = from;
  while (cursor <= to) {
    let totalMinor = 0;
    for (const { inst, acts } of instActivities) {
      const qty = quantityAtDate(acts, cursor);
      if (qty === 0) continue;
      const fallback = latestByInst.get(inst.id) ?? 0;
      const daily = dailyByInst.get(inst.id) ?? [];
      const priceMinor = priceOnDate(daily, cursor, fallback);
      totalMinor += Math.round(qty * priceMinor);
    }
    out.push({ date: cursor, totalMinor });
    cursor = addDaysIso(cursor, 1);
  }
  return out;
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
  const activities = await listWorkspaceInvestmentActivities(workspaceId);
  const quotes = await getLatestQuotesForInstruments(instruments.map((i) => i.id));
  const quoteMap = new Map(quotes.map((q) => [q.instrumentId, q]));

  return instruments.map((inst) => {
    const acts = activities
      .filter((a) => a.instrumentId === inst.id)
      .map((a) => ({
        activityDate: a.activityDate,
        type: a.type,
        quantity: a.quantity,
      }));
    const qty = quantityAtDate(acts, "9999-12-31");
    const quote = quoteMap.get(inst.id);
    const priceMinor = quote?.priceMinor ?? 0;
    const valueMinor = Math.round(qty * priceMinor);
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
  });
}
