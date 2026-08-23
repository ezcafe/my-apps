import { getCurrencyFractionDigits } from "@/lib/format-money";
import { convertSignedMinor } from "@/lib/investment-fx";
import { tradeGrossPnlMinor } from "@/lib/investment-realized-pnl";

export type PortfolioLot = {
  instrumentId: string;
  side: "buy" | "sell";
  quantity: number;
  openPrice: number;
  openDate: string;
  closeDate: string | null;
  realizedPnlMinor: number;
};

export type PortfolioInstrument = {
  id: string;
  contractSize: string;
  currency: string;
};

export type DailyClose = { date: string; closePriceMinor: number };

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return dt.toISOString().slice(0, 10);
}

export function priceOnDate(
  daily: DailyClose[],
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

export function lotIsOpenOn(lot: PortfolioLot, asOf: string): boolean {
  if (lot.openDate > asOf) return false;
  if (lot.closeDate == null) return true;
  return lot.closeDate > asOf;
}

function minorToMajor(minor: number, currency: string): number {
  const scale = 10 ** getCurrencyFractionDigits(currency);
  return minor / scale;
}

function toWorkspaceMinor(
  fromMinor: number,
  fromCurrency: string,
  workspaceCurrency: string,
  fxRateToWorkspace: Map<string, number>,
): number {
  const from = fromCurrency.trim().toUpperCase();
  const to = workspaceCurrency.trim().toUpperCase();
  if (from === to) return fromMinor;
  const rate = fxRateToWorkspace.get(from);
  if (rate == null) return fromMinor;
  try {
    return convertSignedMinor({
      fromMinor,
      fromCurrency: from,
      toCurrency: to,
      rateToPerFrom: rate,
    });
  } catch {
    return fromMinor;
  }
}

/**
 * Equity-style results: cumulative realized P&L plus mark-to-market
 * unrealized P&L on lots still open at end of each day.
 */
export function computePortfolioValueSeries(input: {
  from: string;
  to: string;
  lots: PortfolioLot[];
  instruments: PortfolioInstrument[];
  dailyByInst: Map<string, DailyClose[]>;
  latestByInst: Map<string, number>;
  workspaceCurrency: string;
  fxRateToWorkspace: Map<string, number>;
}): { date: string; totalMinor: number }[] {
  const instById = new Map(input.instruments.map((i) => [i.id, i]));
  const out: { date: string; totalMinor: number }[] = [];
  let cursor = input.from;
  while (cursor <= input.to) {
    let totalMinor = 0;
    for (const lot of input.lots) {
      if (lot.closeDate && lot.closeDate <= cursor) {
        totalMinor += lot.realizedPnlMinor;
        continue;
      }
      if (!lotIsOpenOn(lot, cursor)) continue;
      const inst = instById.get(lot.instrumentId);
      if (!inst) continue;
      const fallback = input.latestByInst.get(inst.id) ?? 0;
      const daily = input.dailyByInst.get(inst.id) ?? [];
      const priceMinor = priceOnDate(daily, cursor, fallback);
      const unrealized = tradeGrossPnlMinor({
        side: lot.side,
        lots: lot.quantity,
        contractSize: inst.contractSize,
        openPrice: lot.openPrice,
        closePrice: minorToMajor(priceMinor, inst.currency),
        currency: inst.currency,
      });
      totalMinor += toWorkspaceMinor(
        unrealized,
        inst.currency,
        input.workspaceCurrency,
        input.fxRateToWorkspace,
      );
    }
    out.push({ date: cursor, totalMinor });
    cursor = addDaysIso(cursor, 1);
  }
  return out;
}
