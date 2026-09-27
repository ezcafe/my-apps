import type { InvestmentActivitiesQueryInput } from "@/lib/investment-query-options";

export type InvestmentChartDrilldownPayload = {
  title: string;
  query: InvestmentActivitiesQueryInput;
};

export function investmentDrilldownForKind(input: {
  kindLabel: string;
  from?: string;
  to?: string;
}): InvestmentChartDrilldownPayload {
  return {
    title: `${input.kindLabel} · activities`,
    query: {
      kind: input.kindLabel,
      from: input.from,
      to: input.to,
      limit: 50,
    },
  };
}

export function investmentDrilldownForDate(input: {
  date: string;
}): InvestmentChartDrilldownPayload {
  /** Activities API accepts YYYY-MM-DD only — strip time if a chart passes ISO. */
  const day = input.date.slice(0, 10);
  return {
    title: `Activities · ${day}`,
    query: {
      from: day,
      to: day,
      limit: 50,
    },
  };
}

export function resolveInstrumentIdBySymbol(
  instruments: ReadonlyArray<{ id: string; symbol: string }>,
  symbol: string,
): string | undefined {
  const needle = symbol.trim().toLowerCase();
  return instruments.find((i) => i.symbol.trim().toLowerCase() === needle)?.id;
}
