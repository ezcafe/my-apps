import type { AmortizationScheduleRow } from "@/lib/loans-amortization";
import { buildAmortizationSchedule } from "@/lib/loans-amortization";

export type LoanInstallmentForRebuild = {
  scheduleInstallmentId: string;
  installmentNumber: number;
  dueDate: string;
  principalMinor: number;
  status: string;
};

export type LoanUpdateTerms = {
  principalMinor: number;
  annualRateBps: number;
  termMonths: number;
  startDate: string;
  dueDayOfMonth: number;
  paymentMinor?: number | null;
  initialRateMonths?: number | null;
  rateAfterInitialBps?: number | null;
  paymentAfterRateChangeMinor?: number | null;
};

export type LoanScheduleRebuildPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      paidCount: number;
      remainingPrincipal: number;
      pendingIdsToDelete: string[];
      /** null when remaining principal is 0 — no new rows */
      newSchedule: AmortizationScheduleRow[] | null;
      loanPaymentMinor: number;
      status: "active" | "paid_off";
    };

function dayAfterIso(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Pure plan for updating a loan: keep paid/skipped rows, rebuild pending from
 * remaining principal. Used by `updateLoan` and unit tests.
 */
export function planLoanScheduleRebuild(
  installments: readonly LoanInstallmentForRebuild[],
  terms: LoanUpdateTerms,
): LoanScheduleRebuildPlan {
  const kept = installments.filter(
    (i) => i.status === "paid" || i.status === "skipped",
  );
  const pending = installments.filter((i) => i.status === "pending");

  const paidCount = kept.length;
  const paidPrincipal = kept.reduce((sum, i) => sum + i.principalMinor, 0);
  const remainingPrincipal = terms.principalMinor - paidPrincipal;

  if (remainingPrincipal < 0) {
    return {
      ok: false,
      error:
        "Principal cannot be less than principal already paid on this loan",
    };
  }

  if (terms.termMonths < paidCount) {
    return {
      ok: false,
      error: "Term cannot be shorter than the number of paid installments",
    };
  }

  const remainingTerm = terms.termMonths - paidCount;
  if (remainingPrincipal > 0 && remainingTerm < 1) {
    return {
      ok: false,
      error: "Need at least one remaining month for the unpaid balance",
    };
  }

  const pendingIdsToDelete = pending.map((i) => i.scheduleInstallmentId);

  if (remainingPrincipal === 0) {
    return {
      ok: true,
      paidCount,
      remainingPrincipal: 0,
      pendingIdsToDelete,
      newSchedule: null,
      loanPaymentMinor:
        terms.paymentMinor != null && terms.paymentMinor > 0
          ? terms.paymentMinor
          : 1,
      status: "paid_off",
    };
  }

  const lastKept = kept.reduce<LoanInstallmentForRebuild | null>((best, row) => {
    if (!best || row.installmentNumber > best.installmentNumber) return row;
    return best;
  }, null);

  const scheduleStartDate = lastKept
    ? dayAfterIso(lastKept.dueDate)
    : terms.startDate;

  const remainingInitial =
    terms.initialRateMonths != null && terms.initialRateMonths > 0
      ? Math.max(0, terms.initialRateMonths - paidCount)
      : 0;

  let annualRateBps = terms.annualRateBps;
  let initialRateMonths: number | null = null;
  let rateAfterInitialBps: number | null = null;
  let paymentAfterRateChangeMinor: number | null | undefined =
    terms.paymentAfterRateChangeMinor;

  if (remainingInitial > 0 && remainingInitial < remainingTerm) {
    initialRateMonths = remainingInitial;
    rateAfterInitialBps = terms.rateAfterInitialBps ?? null;
    if (rateAfterInitialBps == null) {
      return {
        ok: false,
        error:
          "Rate after initial period is required when the initial rate period is shorter than the loan term",
      };
    }
  } else if (
    remainingInitial === 0 &&
    terms.initialRateMonths != null &&
    terms.initialRateMonths > 0 &&
    terms.initialRateMonths < terms.termMonths &&
    terms.rateAfterInitialBps != null
  ) {
    // Paid through the initial period — remaining schedule uses post-change rate.
    annualRateBps = terms.rateAfterInitialBps;
    paymentAfterRateChangeMinor = null;
  }

  let schedule: AmortizationScheduleRow[];
  try {
    schedule = buildAmortizationSchedule({
      principalMinor: remainingPrincipal,
      annualRateBps,
      termMonths: remainingTerm,
      startDate: scheduleStartDate,
      dueDayOfMonth: terms.dueDayOfMonth,
      paymentMinor: terms.paymentMinor ?? undefined,
      initialRateMonths,
      rateAfterInitialBps,
      paymentAfterRateChangeMinor: paymentAfterRateChangeMinor ?? undefined,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not rebuild schedule",
    };
  }

  const renumbered = schedule.map((row, index) => ({
    ...row,
    installmentNumber: paidCount + index + 1,
  }));

  const loanPaymentMinor =
    terms.paymentMinor ??
    renumbered.find((row) => row.paymentMinor > 0)?.paymentMinor ??
    remainingPrincipal;

  return {
    ok: true,
    paidCount,
    remainingPrincipal,
    pendingIdsToDelete,
    newSchedule: renumbered,
    loanPaymentMinor,
    status: "active",
  };
}
