export const INVESTMENT_KIND_LABELS: Record<string, string> = {
  stocks: "Stocks",
  fx: "FX",
  coins: "Coins",
  commodities: "Commodities",
};

export type InsightsSlice = {
  label: string;
  kind?: string;
  valueMinor: number;
};

export type InsightsPnlBySymbol = {
  symbol: string;
  label: string;
  valueMinor: number;
};

export function allocationByKind(
  holdings: ReadonlyArray<{ kind: string; valueMinor: number }>,
): InsightsSlice[] {
  const byKind = new Map<string, number>();
  for (const row of holdings) {
    if (row.valueMinor <= 0) continue;
    byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + row.valueMinor);
  }
  return [...byKind.entries()]
    .map(([kind, valueMinor]) => ({
      kind,
      label: INVESTMENT_KIND_LABELS[kind] ?? kind,
      valueMinor,
    }))
    .sort((a, b) => b.valueMinor - a.valueMinor);
}

export function realizedPnlMinor(
  lots: ReadonlyArray<{ closeDate: string | null; realizedPnlMinor: number }>,
): number {
  let sum = 0;
  for (const lot of lots) {
    if (lot.closeDate == null) continue;
    sum += lot.realizedPnlMinor;
  }
  return sum;
}

export function openLotsCount(
  lots: ReadonlyArray<{ closeDate: string | null }>,
): number {
  let n = 0;
  for (const lot of lots) {
    if (lot.closeDate == null) n += 1;
  }
  return n;
}

export function maxDrawdownMinor(
  series: ReadonlyArray<{ totalMinor: number }>,
): number {
  let peak = Number.NEGATIVE_INFINITY;
  let maxDd = 0;
  for (const point of series) {
    if (point.totalMinor > peak) peak = point.totalMinor;
    const dd = peak - point.totalMinor;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

export function closedTradeHitRate(
  lots: ReadonlyArray<{ closeDate: string | null; realizedPnlMinor: number }>,
): { closedCount: number; winningClosedCount: number } {
  let closedCount = 0;
  let winningClosedCount = 0;
  for (const lot of lots) {
    if (lot.closeDate == null) continue;
    closedCount += 1;
    if (lot.realizedPnlMinor > 0) winningClosedCount += 1;
  }
  return { closedCount, winningClosedCount };
}

export function pnlBySymbol(
  rows: ReadonlyArray<{ symbol: string; name: string; pnlMinor: number }>,
): InsightsPnlBySymbol[] {
  const bySymbol = new Map<string, { label: string; valueMinor: number }>();
  for (const row of rows) {
    const prev = bySymbol.get(row.symbol);
    if (prev) {
      prev.valueMinor += row.pnlMinor;
    } else {
      bySymbol.set(row.symbol, { label: row.name, valueMinor: row.pnlMinor });
    }
  }
  return [...bySymbol.entries()]
    .map(([symbol, v]) => ({ symbol, label: v.label, valueMinor: v.valueMinor }))
    .sort((a, b) => Math.abs(b.valueMinor) - Math.abs(a.valueMinor));
}
