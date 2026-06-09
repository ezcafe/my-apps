export type LoanCalculationMethod =
  | "nominal_monthly"
  | "sc_vn_calculator"
  | "sc_vn_actual_365";

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

type ScheduleInput = {
  principalMinor: number;
  annualRateBps: number;
  termMonths: number;
  startDate: string;
  dueDayOfMonth: number;
  paymentMinor?: number;
  calculationMethod?: LoanCalculationMethod;
};

function assertPositivePrincipalAndTerm(
  principalMinor: number,
  termMonths: number,
): void {
  if (termMonths <= 0) throw new Error("termMonths must be positive");
  if (principalMinor <= 0) throw new Error("principal must be positive");
}

/** Nominal monthly rate from basis points (APR / 12). */
function monthlyRateFromBps(annualRateBps: number): number {
  return annualRateBps / 10_000 / 12;
}

/** Annual rate as percent from basis points (525 bps → 5.25). */
function annualRatePercentFromBps(annualRateBps: number): number {
  return annualRateBps / 100;
}

/** SC web calculator rounds via `parseFloat(x).toFixed()` (0 decimal places). */
function scVnRoundMinor(value: number): number {
  return Number.parseFloat(value.toFixed(0));
}

/** SC web calculator EMI as float — port of `monthlyInstalment` in loan-calculator-vn.min.js. */
export function computeScVnEmiFloat(
  principalMinor: number,
  annualRateBps: number,
  termMonths: number,
): number {
  assertPositivePrincipalAndTerm(principalMinor, termMonths);
  if (annualRateBps === 0) {
    return principalMinor / termMonths;
  }
  const r = annualRatePercentFromBps(annualRateBps) / 1200;
  return principalMinor / ((1 - (1 + r) ** -termMonths) / r);
}

/** SC web calculator EMI — port of `monthlyInstalment` in loan-calculator-vn.min.js. */
export function computeScVnEmiMinor(
  principalMinor: number,
  annualRateBps: number,
  termMonths: number,
): number {
  return Math.round(
    computeScVnEmiFloat(principalMinor, annualRateBps, termMonths),
  );
}

/** Fixed monthly payment in minor units (rounded). */
export function computeMonthlyPaymentMinor(
  principalMinor: number,
  annualRateBps: number,
  termMonths: number,
  calculationMethod: LoanCalculationMethod = "nominal_monthly",
): number {
  assertPositivePrincipalAndTerm(principalMinor, termMonths);
  if (calculationMethod === "sc_vn_calculator") {
    return computeScVnEmiMinor(principalMinor, annualRateBps, termMonths);
  }
  if (calculationMethod === "sc_vn_actual_365") {
    return computeActual365EmiMinor(principalMinor, annualRateBps, termMonths);
  }
  if (annualRateBps === 0) {
    return Math.round(principalMinor / termMonths);
  }
  // Standard EMI: P × r × (1+r)^n / ((1+r)^n − 1), r = APR/12
  const r = monthlyRateFromBps(annualRateBps);
  const factor = (1 + r) ** termMonths;
  const payment = (principalMinor * (r * factor)) / (factor - 1);
  return Math.round(payment);
}

/** First-period interest for create-form preview. */
export function computeFirstMonthInterestMinor(
  principalMinor: number,
  annualRateBps: number,
  calculationMethod: LoanCalculationMethod = "nominal_monthly",
  startDate?: string,
  dueDayOfMonth?: number,
): number {
  if (annualRateBps === 0) return 0;
  if (
    calculationMethod === "sc_vn_actual_365" &&
    startDate != null &&
    dueDayOfMonth != null
  ) {
    const dueDate = dueDateForInstallment(startDate, dueDayOfMonth, 1);
    const days = daysBetweenExclusive(startDate, dueDate);
    return Math.round(
      (principalMinor * annualRateBps * days) / (10_000 * 365),
    );
  }
  // nominal_monthly and sc_vn_calculator: principal * rate / 1200
  return Math.round((principalMinor * annualRateBps) / 120_000);
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

export function minimumMonthlyPaymentMinor(
  principalMinor: number,
  annualRateBps: number,
  calculationMethod: LoanCalculationMethod = "nominal_monthly",
): number {
  if (annualRateBps === 0) return 1;
  if (calculationMethod === "sc_vn_actual_365") {
    return Math.round((principalMinor * annualRateBps) / (10_000 * 365)) + 1;
  }
  const monthlyRate = monthlyRateFromBps(annualRateBps);
  return Math.round(principalMinor * monthlyRate) + 1;
}

function buildNominalMonthlySchedule(input: ScheduleInput): AmortizationScheduleRow[] {
  // Standard EMI schedule: fixed payment via P × r × (1+r)^n / ((1+r)^n − 1), r = APR/12
  const paymentMinor =
    input.paymentMinor ??
    computeMonthlyPaymentMinor(
      input.principalMinor,
      input.annualRateBps,
      input.termMonths,
      "nominal_monthly",
    );
  if (paymentMinor <= 0) {
    throw new Error("Monthly payment must be positive");
  }
  const minPayment = minimumMonthlyPaymentMinor(
    input.principalMinor,
    input.annualRateBps,
    "nominal_monthly",
  );
  if (paymentMinor < minPayment) {
    throw new Error("Monthly payment is too low to cover interest");
  }
  const monthlyRate =
    input.annualRateBps === 0 ? 0 : monthlyRateFromBps(input.annualRateBps);

  const rows: AmortizationScheduleRow[] = [];
  let balance = input.principalMinor;

  for (let n = 1; n <= input.termMonths; n += 1) {
    const isLast = n === input.termMonths;
    const interestMinor = Math.round(balance * monthlyRate);
    let principalMinor = paymentMinor - interestMinor;

    if (isLast) {
      principalMinor = balance;
      const payment = principalMinor + interestMinor;
      rows.push({
        installmentNumber: n,
        dueDate: dueDateForInstallment(
          input.startDate,
          input.dueDayOfMonth,
          n,
        ),
        paymentMinor: payment,
        principalMinor,
        interestMinor,
        balanceAfterMinor: 0,
      });
      break;
    }

    if (principalMinor > balance) {
      principalMinor = balance;
    }

    const rowPayment = principalMinor + interestMinor;
    balance -= principalMinor;

    rows.push({
      installmentNumber: n,
      dueDate: dueDateForInstallment(input.startDate, input.dueDayOfMonth, n),
      paymentMinor: rowPayment,
      principalMinor,
      interestMinor,
      balanceAfterMinor: Math.max(0, balance),
    });
  }

  return rows;
}

/** SC VN web calculator schedule — port of `generateRows` in loan-calculator-vn.min.js. */
function buildScVnCalculatorSchedule(input: ScheduleInput): AmortizationScheduleRow[] {
  const paymentFloat =
    input.paymentMinor ??
    computeScVnEmiFloat(
      input.principalMinor,
      input.annualRateBps,
      input.termMonths,
    );
  if (paymentFloat <= 0) {
    throw new Error("Monthly payment must be positive");
  }
  const minPayment = minimumMonthlyPaymentMinor(
    input.principalMinor,
    input.annualRateBps,
    "sc_vn_calculator",
  );
  if (paymentFloat < minPayment) {
    throw new Error("Monthly payment is too low to cover interest");
  }

  const ratePercent = annualRatePercentFromBps(input.annualRateBps);
  const rows: AmortizationScheduleRow[] = [];
  let balance = input.principalMinor;
  let interestFloat =
    input.annualRateBps === 0
      ? 0
      : (balance * ratePercent) / 100 / 12;
  let principalFloat = paymentFloat - interestFloat;

  for (let n = 1; n <= input.termMonths; n += 1) {
    const isLast = n === input.termMonths;
    const dueDate = dueDateForInstallment(
      input.startDate,
      input.dueDayOfMonth,
      n,
    );

    const interestMinor = scVnRoundMinor(interestFloat);
    const paymentMinor = scVnRoundMinor(paymentFloat);

    if (isLast) {
      const sumPrincipalSoFar = rows.reduce((s, r) => s + r.principalMinor, 0);
      const principalMinor = input.principalMinor - sumPrincipalSoFar;
      rows.push({
        installmentNumber: n,
        dueDate,
        paymentMinor: principalMinor + interestMinor,
        principalMinor,
        interestMinor,
        balanceAfterMinor: 0,
      });
      break;
    }

    const principalMinor = scVnRoundMinor(principalFloat);
    balance -= principalFloat;
    if (balance < 0) balance = 0;

    rows.push({
      installmentNumber: n,
      dueDate,
      paymentMinor,
      principalMinor,
      interestMinor,
      balanceAfterMinor: Math.max(0, scVnRoundMinor(balance)),
    });

    interestFloat =
      input.annualRateBps === 0 ? 0 : (balance * ratePercent) / 100 / 12;
    principalFloat = paymentFloat - interestFloat;
  }

  return rows;
}

function simulateActual365Balance(
  principalMinor: number,
  annualRateBps: number,
  termMonths: number,
  startDate: string,
  dueDayOfMonth: number,
  paymentMinor: number,
): number {
  let balance = principalMinor;
  let accrualAnchor = startDate;

  for (let n = 1; n <= termMonths; n += 1) {
    const dueDate = dueDateForInstallment(startDate, dueDayOfMonth, n);
    const days = daysBetweenExclusive(accrualAnchor, dueDate);
    const interestMinor =
      annualRateBps === 0
        ? 0
        : Math.round((balance * annualRateBps * days) / (10_000 * 365));
    const principalMinor =
      n === termMonths ? balance : paymentMinor - interestMinor;
    balance -= principalMinor;
    accrualAnchor = dueDate;
  }

  return balance;
}

/** Binary search EMI for actual/365 so balance reaches ~0 on last due date. */
export function computeActual365EmiMinor(
  principalMinor: number,
  annualRateBps: number,
  termMonths: number,
  startDate = "2026-01-01",
  dueDayOfMonth = 1,
): number {
  assertPositivePrincipalAndTerm(principalMinor, termMonths);
  if (annualRateBps === 0) {
    return Math.round(principalMinor / termMonths);
  }

  let lo = minimumMonthlyPaymentMinor(
    principalMinor,
    annualRateBps,
    "sc_vn_actual_365",
  );
  let hi = principalMinor;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const remaining = simulateActual365Balance(
      principalMinor,
      annualRateBps,
      termMonths,
      startDate,
      dueDayOfMonth,
      mid,
    );
    if (remaining > 0) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

function buildActual365Schedule(input: ScheduleInput): AmortizationScheduleRow[] {
  const paymentMinor =
    input.paymentMinor ??
    computeActual365EmiMinor(
      input.principalMinor,
      input.annualRateBps,
      input.termMonths,
      input.startDate,
      input.dueDayOfMonth,
    );
  if (paymentMinor <= 0) {
    throw new Error("Monthly payment must be positive");
  }
  const minPayment = minimumMonthlyPaymentMinor(
    input.principalMinor,
    input.annualRateBps,
    "sc_vn_actual_365",
  );
  if (paymentMinor < minPayment) {
    throw new Error("Monthly payment is too low to cover interest");
  }

  const rows: AmortizationScheduleRow[] = [];
  let balance = input.principalMinor;
  let accrualAnchor = input.startDate;

  for (let n = 1; n <= input.termMonths; n += 1) {
    const isLast = n === input.termMonths;
    const dueDate = dueDateForInstallment(
      input.startDate,
      input.dueDayOfMonth,
      n,
    );
    const days = daysBetweenExclusive(accrualAnchor, dueDate);
    const interestMinor =
      input.annualRateBps === 0
        ? 0
        : Math.round((balance * input.annualRateBps * days) / (10_000 * 365));

    let principalMinor = isLast ? balance : paymentMinor - interestMinor;
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

export function buildAmortizationSchedule(
  input: ScheduleInput,
): AmortizationScheduleRow[] {
  const method = input.calculationMethod ?? "nominal_monthly";
  if (method === "sc_vn_calculator") {
    return buildScVnCalculatorSchedule(input);
  }
  if (method === "sc_vn_actual_365") {
    return buildActual365Schedule(input);
  }
  return buildNominalMonthlySchedule(input);
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

export const LOAN_CALCULATION_METHOD_LABELS: Record<
  LoanCalculationMethod,
  string
> = {
  nominal_monthly: "Equal monthly payment (EMI)",
  sc_vn_calculator: "EMI with Standard Chartered rounding",
  sc_vn_actual_365: "Daily interest (actual/365)",
};

export const LOAN_CALCULATION_METHOD_DESCRIPTIONS: Record<
  LoanCalculationMethod,
  string
> = {
  nominal_monthly:
    "Fixed payment every month. Interest is charged on the remaining balance at annual rate ÷ 12; the principal portion grows over time.",
  sc_vn_calculator:
    "Same equal-payment formula as standard EMI, but each installment uses Standard Chartered VN web-calculator rounding.",
  sc_vn_actual_365:
    "Interest accrues daily between due dates (balance × rate × days ÷ 365). Monthly payment is computed to amortize the loan — may differ slightly from standard EMI.",
};
