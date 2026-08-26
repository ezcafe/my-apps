export type LoanInsightsListRow = {
  id: string;
  name: string;
  status: string;
  remainingMinor: number;
  paymentMinor: number;
  annualRateBps: number;
  nextDueDate: string | null;
  percentComplete: number;
  collateralValueMinor: number | null;
};

export type LoanInsightsSlice = {
  id: string;
  label: string;
  valueMinor: number;
};

export function activeLoans<T extends { status: string }>(loans: readonly T[]): T[] {
  return loans.filter((loan) => loan.status !== "paid_off" && loan.status !== "cancelled");
}

export function remainingTotal(
  loans: ReadonlyArray<{ status: string; remainingMinor: number }>,
): number {
  return activeLoans(loans).reduce((sum, loan) => sum + loan.remainingMinor, 0);
}

export function monthlyObligation(
  loans: ReadonlyArray<{ status: string; paymentMinor: number }>,
): number {
  return activeLoans(loans).reduce((sum, loan) => sum + loan.paymentMinor, 0);
}

/** Remaining-weighted APR in basis points, or null when nothing is owed. */
export function weightedAprBps(
  loans: ReadonlyArray<{
    status: string;
    remainingMinor: number;
    annualRateBps: number;
  }>,
): number | null {
  const active = activeLoans(loans);
  const remaining = active.reduce((sum, loan) => sum + loan.remainingMinor, 0);
  if (remaining <= 0) return null;
  const weighted = active.reduce(
    (sum, loan) => sum + loan.remainingMinor * loan.annualRateBps,
    0,
  );
  return Math.round(weighted / remaining);
}

export function earliestNextDue(
  loans: ReadonlyArray<{ status: string; nextDueDate: string | null }>,
): string | null {
  const dates = activeLoans(loans)
    .map((loan) => loan.nextDueDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates[0] ?? null;
}

export function remainingByLoan(
  loans: ReadonlyArray<{
    id: string;
    name: string;
    status: string;
    remainingMinor: number;
  }>,
): LoanInsightsSlice[] {
  return activeLoans(loans)
    .filter((loan) => loan.remainingMinor > 0)
    .map((loan) => ({
      id: loan.id,
      label: loan.name,
      valueMinor: loan.remainingMinor,
    }))
    .sort((a, b) => b.valueMinor - a.valueMinor);
}

export function paidPrincipalVsInterest(
  installments: ReadonlyArray<{
    status: string;
    principalMinor: number;
    interestMinor: number;
    paidAt?: string | Date | null;
    dueDate?: string | null;
  }>,
  range?: { from: string; to: string },
): { principalMinor: number; interestMinor: number } {
  let principalMinor = 0;
  let interestMinor = 0;
  for (const row of installments) {
    if (row.status !== "paid") continue;
    if (range) {
      const on = installmentPaidCalendarDate(row);
      if (on == null || on < range.from || on > range.to) continue;
    }
    principalMinor += row.principalMinor;
    interestMinor += row.interestMinor;
  }
  return { principalMinor, interestMinor };
}

function installmentPaidCalendarDate(row: {
  paidAt?: string | Date | null;
  dueDate?: string | null;
}): string | null {
  if (row.paidAt != null) {
    if (row.paidAt instanceof Date) {
      if (Number.isNaN(row.paidAt.getTime())) return null;
      return row.paidAt.toISOString().slice(0, 10);
    }
    const raw = String(row.paidAt);
    if (raw.length >= 10) return raw.slice(0, 10);
  }
  if (row.dueDate != null && row.dueDate.length >= 10) {
    return row.dueDate.slice(0, 10);
  }
  return null;
}

export function remainingInterestMinor(
  installments: ReadonlyArray<{ status: string; interestMinor: number }>,
): number {
  let sum = 0;
  for (const row of installments) {
    if (row.status === "paid") continue;
    sum += row.interestMinor;
  }
  return sum;
}

/** Remaining / collateral across loans that have collateral; null if none. */
export function portfolioLtvPct(
  loans: ReadonlyArray<{
    status: string;
    remainingMinor: number;
    collateralValueMinor: number | null;
  }>,
): number | null {
  let remaining = 0;
  let collateral = 0;
  for (const loan of activeLoans(loans)) {
    if (loan.collateralValueMinor == null || loan.collateralValueMinor <= 0) {
      continue;
    }
    remaining += loan.remainingMinor;
    collateral += loan.collateralValueMinor;
  }
  if (collateral <= 0) return null;
  return (remaining / collateral) * 100;
}

export type CombinedProgressPoint = {
  label: string;
  scheduledCumulativeMinor: number;
  actualCumulativeMinor: number;
  projectedCumulativeMinor: number;
};

export function combineLoanProgressSeries(
  charts: ReadonlyArray<ReadonlyArray<CombinedProgressPoint>>,
): CombinedProgressPoint[] {
  const maxLen = charts.reduce((n, c) => Math.max(n, c.length), 0);
  const out: CombinedProgressPoint[] = [];
  for (let i = 0; i < maxLen; i += 1) {
    let scheduledCumulativeMinor = 0;
    let actualCumulativeMinor = 0;
    let projectedCumulativeMinor = 0;
    for (const chart of charts) {
      const point = chart[i] ?? chart[chart.length - 1];
      if (!point) continue;
      scheduledCumulativeMinor += point.scheduledCumulativeMinor;
      actualCumulativeMinor += point.actualCumulativeMinor;
      projectedCumulativeMinor += point.projectedCumulativeMinor;
    }
    out.push({
      label: String(i + 1),
      scheduledCumulativeMinor,
      actualCumulativeMinor,
      projectedCumulativeMinor,
    });
  }
  return out;
}
