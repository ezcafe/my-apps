import type { AmortizationScheduleRow } from "@/lib/loans-amortization";
import {
  buildAmortizationSchedule,
  dueDateForInstallment,
} from "@/lib/loans-amortization";

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

export type KeptDueDateUpdate = {
  scheduleInstallmentId: string;
  dueDate: string;
};

export type LoanScheduleRebuildPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      paidCount: number;
      remainingPrincipal: number;
      pendingIdsToDelete: string[];
      /** Align paid/skipped rows to the updated start/due-day calendar. */
      keptDueDateUpdates: KeptDueDateUpdate[];
      /** null when remaining principal is 0 — no new rows */
      newSchedule: AmortizationScheduleRow[] | null;
      loanPaymentMinor: number;
      status: "active" | "paid_off";
    };

/**
 * Pure plan for updating a loan: keep paid/skipped rows (with due dates
 * realigned to the new start/due-day), rebuild pending from remaining
 * principal. Used by `updateLoan` and unit tests.
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

  const keptDueDateUpdates: KeptDueDateUpdate[] = kept.map((row) => ({
    scheduleInstallmentId: row.scheduleInstallmentId,
    dueDate: dueDateForInstallment(
      terms.startDate,
      terms.dueDayOfMonth,
      row.installmentNumber,
    ),
  }));

  if (remainingPrincipal === 0) {
    return {
      ok: true,
      paidCount,
      remainingPrincipal: 0,
      pendingIdsToDelete,
      keptDueDateUpdates,
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

  const lastKeptAlignedDue = lastKept
    ? dueDateForInstallment(
        terms.startDate,
        terms.dueDayOfMonth,
        lastKept.installmentNumber,
      )
    : null;

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
      startDate: terms.startDate,
      dueDayOfMonth: terms.dueDayOfMonth,
      paymentMinor: terms.paymentMinor ?? undefined,
      initialRateMonths,
      rateAfterInitialBps,
      paymentAfterRateChangeMinor: paymentAfterRateChangeMinor ?? undefined,
      installmentNumberOffset: paidCount,
      accrualStartDate: lastKeptAlignedDue ?? terms.startDate,
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
    keptDueDateUpdates,
    newSchedule: renumbered,
    loanPaymentMinor,
    status: "active",
  };
}
