export type AmortizationScheduleRow = {
  installmentNumber: number;
  dueDate: string;
  paymentMinor: number;
  principalMinor: number;
  interestMinor: number;
  balanceAfterMinor: number;
};

export type InstallmentPaymentState = {
  installmentNumber: number;
  principalMinor: number;
  status: "pending" | "paid" | "skipped";
  dueDate: string;
};

export type LoanSummaryMetrics = {
  totalPaidMinor: number;
  remainingMinor: number;
  percentComplete: number;
  projectedPayoffDate: string | null;
  monthsAheadBehind: number;
  nextDueInstallmentNumber: number | null;
};

export type ScheduleInput = {
  principalMinor: number;
  annualRateBps: number;
  termMonths: number;
  startDate: string;
  dueDayOfMonth: number;
  paymentMinor?: number;
  initialRateMonths?: number | null;
  rateAfterInitialBps?: number | null;
  paymentAfterRateChangeMinor?: number | null;
};

function assertPositivePrincipalAndTerm(
  principalMinor: number,
  termMonths: number,
): void {
  if (termMonths <= 0) throw new Error("termMonths must be positive");
  if (principalMinor <= 0) throw new Error("principal must be positive");
}

/** PMT EMI in minor units (integer-rounded). */
export function computeMonthlyPaymentMinor(
  principalMinor: number,
  annualRateBps: number,
  termMonths: number,
): number {
  assertPositivePrincipalAndTerm(principalMinor, termMonths);
  if (annualRateBps === 0) {
    return Math.round(principalMinor / termMonths);
  }
  const r = annualRateBps / 10_000 / 12;
  const factor = (1 + r) ** termMonths;
  const payment = (principalMinor * (r * factor)) / (factor - 1);
  return Math.round(payment);
}

/** First-period interest for create-form preview (actual/365 over first accrual window). */
export function computeFirstMonthInterestMinor(
  principalMinor: number,
  annualRateBps: number,
  startDate: string,
  dueDayOfMonth: number,
): number {
  if (annualRateBps === 0) return 0;
  const dueDate = dueDateForInstallment(startDate, dueDayOfMonth, 1);
  const days = daysBetweenExclusive(startDate, dueDate);
  return Math.round(
    (principalMinor * annualRateBps * days) / (10_000 * 365),
  );
}

function clampDueDay(year: number, monthIndex: number, dueDay: number): number {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(dueDay, last);
}

function formatUtcDate(year: number, monthIndex: number, day: number): string {
  const y = String(year);
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseUtcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Calendar days from start (inclusive) to end (exclusive), per SC contract terms. */
export function daysBetweenExclusive(startIso: string, endIso: string): number {
  const start = parseUtcDate(startIso);
  const end = parseUtcDate(endIso);
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.round(ms / 86_400_000);
}

function firstDueDateFromStart(
  startDate: string,
  dueDayOfMonth: number,
): string {
  const [y, m] = startDate.split("-").map(Number);
  const startMonthIndex = m - 1;
  const dayInStartMonth = clampDueDay(y, startMonthIndex, dueDayOfMonth);
  const candidate = formatUtcDate(y, startMonthIndex, dayInStartMonth);
  if (candidate >= startDate) return candidate;

  const monthIndex = startMonthIndex + 1;
  const year = y + Math.floor(monthIndex / 12);
  const normalizedMonth = ((monthIndex % 12) + 12) % 12;
  const day = clampDueDay(year, normalizedMonth, dueDayOfMonth);
  return formatUtcDate(year, normalizedMonth, day);
}

/** Due date for installment N (1-based). First payment is the first due-day on or after start. */
export function dueDateForInstallment(
  startDate: string,
  dueDayOfMonth: number,
  installmentNumber: number,
): string {
  const firstDue = firstDueDateFromStart(startDate, dueDayOfMonth);
  if (installmentNumber === 1) return firstDue;

  const [fy, fm] = firstDue.split("-").map(Number);
  const monthIndex = fm - 1 + (installmentNumber - 1);
  const year = fy + Math.floor(monthIndex / 12);
  const normalizedMonth = ((monthIndex % 12) + 12) % 12;
  const day = clampDueDay(year, normalizedMonth, dueDayOfMonth);
  return formatUtcDate(year, normalizedMonth, day);
}

function minimumMonthlyPaymentMinor(
  principalMinor: number,
  annualRateBps: number,
): number {
  if (annualRateBps === 0) return 1;
  return Math.round((principalMinor * annualRateBps) / (10_000 * 365)) + 1;
}

function computeDailyInterestMinor(
  balance: number,
  annualRateBps: number,
  accrualAnchor: string,
  dueDate: string,
): number {
  if (annualRateBps === 0) return 0;
  const days = daysBetweenExclusive(accrualAnchor, dueDate);
  return Math.round((balance * annualRateBps * days) / (10_000 * 365));
}

function hasRateChange(input: ScheduleInput): boolean {
  return (
    input.initialRateMonths != null &&
    input.initialRateMonths > 0 &&
    input.initialRateMonths < input.termMonths
  );
}

function validateRateSchedule(input: ScheduleInput): void {
  if (!hasRateChange(input)) return;
  if (input.rateAfterInitialBps == null) {
    throw new Error(
      "Rate after initial period is required when initial rate period is shorter than the loan term",
    );
  }
}

/** SC spreadsheet schedule: PMT EMI + actual/365 daily interest between due dates. */
export function buildAmortizationSchedule(
  input: ScheduleInput,
): AmortizationScheduleRow[] {
  validateRateSchedule(input);

  const rateChangeAt = hasRateChange(input)
    ? input.initialRateMonths!
    : input.termMonths + 1;

  let paymentMinor =
    input.paymentMinor ??
    computeMonthlyPaymentMinor(
      input.principalMinor,
      input.annualRateBps,
      input.termMonths,
    );

  if (paymentMinor <= 0) {
    throw new Error("Monthly payment must be positive");
  }

  const minPayment = minimumMonthlyPaymentMinor(
    input.principalMinor,
    input.annualRateBps,
  );
  if (paymentMinor < minPayment) {
    throw new Error("Monthly payment is too low to cover interest");
  }

  const rows: AmortizationScheduleRow[] = [];
  let balance = input.principalMinor;
  let accrualAnchor = input.startDate;
  let currentRateBps = input.annualRateBps;
  let segmentPaymentMinor = paymentMinor;

  for (let n = 1; n <= input.termMonths; n += 1) {
    const isLast = n === input.termMonths;
    const dueDate = dueDateForInstallment(
      input.startDate,
      input.dueDayOfMonth,
      n,
    );

    if (n === rateChangeAt + 1) {
      currentRateBps = input.rateAfterInitialBps!;
      const remainingTerm = input.termMonths - input.initialRateMonths!;
      segmentPaymentMinor =
        input.paymentAfterRateChangeMinor ??
        computeMonthlyPaymentMinor(balance, currentRateBps, remainingTerm);
      if (segmentPaymentMinor <= 0) {
        throw new Error("Monthly payment after rate change must be positive");
      }
    }

    const interestMinor = computeDailyInterestMinor(
      balance,
      currentRateBps,
      accrualAnchor,
      dueDate,
    );

    let principalMinor = isLast ? balance : segmentPaymentMinor - interestMinor;
    if (principalMinor > balance) {
      principalMinor = balance;
    }
    const rowPayment = principalMinor + interestMinor;
    balance -= principalMinor;

    rows.push({
      installmentNumber: n,
      dueDate,
      paymentMinor: rowPayment,
      principalMinor,
      interestMinor,
      balanceAfterMinor: Math.max(0, balance),
    });

    accrualAnchor = dueDate;
  }

  return rows;
}

export function computeLoanSummary(input: {
  principalMinor: number;
  schedule: readonly AmortizationScheduleRow[];
  installments: readonly InstallmentPaymentState[];
  today?: string;
}): LoanSummaryMetrics {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const paidPrincipal = input.installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.principalMinor, 0);

  const remainingMinor = Math.max(0, input.principalMinor - paidPrincipal);
  const percentComplete =
    input.principalMinor > 0
      ? Math.min(100, (paidPrincipal / input.principalMinor) * 100)
      : 100;

  const paidCount = input.installments.filter((i) => i.status === "paid").length;
  const expectedPaidByToday = input.schedule.filter(
    (r) => r.dueDate <= today,
  ).length;
  const monthsAheadBehind = paidCount - expectedPaidByToday;

  const nextPending = input.installments.find((i) => i.status === "pending");
  const projectedPayoffDate =
    nextPending != null
      ? input.schedule.find((r) => r.installmentNumber >= nextPending.installmentNumber)
          ?.dueDate ??
        input.schedule[input.schedule.length - 1]?.dueDate ??
        null
      : input.schedule[input.schedule.length - 1]?.dueDate ?? null;

  return {
    totalPaidMinor: paidPrincipal,
    remainingMinor,
    percentComplete,
    projectedPayoffDate,
    monthsAheadBehind,
    nextDueInstallmentNumber: nextPending?.installmentNumber ?? null,
  };
}

export type ProgressChartPoint = {
  label: string;
  scheduledCumulativeMinor: number;
  actualCumulativeMinor: number;
  projectedCumulativeMinor: number;
};

export function buildProgressChartSeries(input: {
  schedule: readonly AmortizationScheduleRow[];
  installments: readonly InstallmentPaymentState[];
  principalMinor: number;
  today?: string;
}): ProgressChartPoint[] {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const paidByNumber = new Map(
    input.installments
      .filter((i) => i.status === "paid")
      .map((i) => [i.installmentNumber, i.principalMinor] as const),
  );

  let scheduledCum = 0;
  let actualCum = 0;
  const points: ProgressChartPoint[] = [];

  const paidCount = input.installments.filter((i) => i.status === "paid").length;
  const avgPrincipalPerPaid =
    paidCount > 0
      ? input.installments
          .filter((i) => i.status === "paid")
          .reduce((s, i) => s + i.principalMinor, 0) / paidCount
      : input.schedule[0]?.principalMinor ?? 0;

  for (const row of input.schedule) {
    scheduledCum += row.principalMinor;
    if (paidByNumber.has(row.installmentNumber)) {
      actualCum += paidByNumber.get(row.installmentNumber)!;
    }

    const behind =
      input.installments.filter(
        (i) => i.status === "pending" && i.dueDate < today,
      ).length;
    const remainingInstallments =
      input.schedule.length -
      input.installments.filter((i) => i.status === "paid").length;
    const projectedCum =
      actualCum +
      Math.max(0, remainingInstallments - behind) * avgPrincipalPerPaid;

    points.push({
      label: String(row.installmentNumber),
      scheduledCumulativeMinor: scheduledCum,
      actualCumulativeMinor: actualCum,
      projectedCumulativeMinor: Math.min(
        input.principalMinor,
        Math.round(projectedCum),
      ),
    });
  }

  return points;
}
