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

type RemainingRateTerms =
  | { ok: false; error: string }
  | {
      ok: true;
      annualRateBps: number;
      initialRateMonths: number | null;
      rateAfterInitialBps: number | null;
      paymentAfterRateChangeMinor: number | null | undefined;
    };

/**
 * Map loan-level rate-change terms onto the unpaid suffix after `keptCount`
 * installments are already done.
 */
function resolveRemainingRateTerms(
  terms: LoanUpdateTerms,
  keptCount: number,
  remainingTerm: number,
): RemainingRateTerms {
  const remainingInitial =
    terms.initialRateMonths != null && terms.initialRateMonths > 0
      ? Math.max(0, terms.initialRateMonths - keptCount)
      : 0;

  if (remainingInitial > 0 && remainingInitial < remainingTerm) {
    const rateAfterInitialBps = terms.rateAfterInitialBps ?? null;
    if (rateAfterInitialBps == null) {
      return {
        ok: false,
        error:
          "Rate after initial period is required when the initial rate period is shorter than the loan term",
      };
    }
    return {
      ok: true,
      annualRateBps: terms.annualRateBps,
      initialRateMonths: remainingInitial,
      rateAfterInitialBps,
      paymentAfterRateChangeMinor: terms.paymentAfterRateChangeMinor,
    };
  }

  // Paid through the initial period — remaining schedule uses post-change rate.
  if (
    remainingInitial === 0 &&
    terms.initialRateMonths != null &&
    terms.initialRateMonths > 0 &&
    terms.initialRateMonths < terms.termMonths &&
    terms.rateAfterInitialBps != null
  ) {
    return {
      ok: true,
      annualRateBps: terms.rateAfterInitialBps,
      initialRateMonths: null,
      rateAfterInitialBps: null,
      paymentAfterRateChangeMinor: null,
    };
  }

  return {
    ok: true,
    annualRateBps: terms.annualRateBps,
    initialRateMonths: null,
    rateAfterInitialBps: null,
    paymentAfterRateChangeMinor: terms.paymentAfterRateChangeMinor,
  };
}

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

  const keptCount = kept.length;
  const paidPrincipal = kept.reduce((sum, i) => sum + i.principalMinor, 0);
  const remainingPrincipal = terms.principalMinor - paidPrincipal;

  if (remainingPrincipal < 0) {
    return {
      ok: false,
      error:
        "Principal cannot be less than principal already paid on this loan",
    };
  }

  if (terms.termMonths < keptCount) {
    return {
      ok: false,
      error: "Term cannot be shorter than the number of paid installments",
    };
  }

  const remainingTerm = terms.termMonths - keptCount;
  if (remainingPrincipal > 0 && remainingTerm < 1) {
    return {
      ok: false,
      error: "Need at least one remaining month for the unpaid balance",
    };
  }

  const pendingIdsToDelete = pending.map((i) => i.scheduleInstallmentId);

  const keptDueDateById = new Map(
    kept.map((row) => [
      row.scheduleInstallmentId,
      dueDateForInstallment(
        terms.startDate,
        terms.dueDayOfMonth,
        row.installmentNumber,
      ),
    ]),
  );
  const keptDueDateUpdates: KeptDueDateUpdate[] = kept.map((row) => ({
    scheduleInstallmentId: row.scheduleInstallmentId,
    dueDate: keptDueDateById.get(row.scheduleInstallmentId)!,
  }));

  if (remainingPrincipal === 0) {
    return {
      ok: true,
      paidCount: keptCount,
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
  const accrualStartDate = lastKept
    ? keptDueDateById.get(lastKept.scheduleInstallmentId)!
    : terms.startDate;

  const rateTerms = resolveRemainingRateTerms(terms, keptCount, remainingTerm);
  if (!rateTerms.ok) {
    return { ok: false, error: rateTerms.error };
  }

  let schedule: AmortizationScheduleRow[];
  try {
    schedule = buildAmortizationSchedule({
      principalMinor: remainingPrincipal,
      annualRateBps: rateTerms.annualRateBps,
      termMonths: remainingTerm,
      startDate: terms.startDate,
      dueDayOfMonth: terms.dueDayOfMonth,
      paymentMinor: terms.paymentMinor ?? undefined,
      initialRateMonths: rateTerms.initialRateMonths,
      rateAfterInitialBps: rateTerms.rateAfterInitialBps,
      paymentAfterRateChangeMinor:
        rateTerms.paymentAfterRateChangeMinor ?? undefined,
      installmentNumberOffset: keptCount,
      accrualStartDate,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not rebuild schedule",
    };
  }

  const loanPaymentMinor =
    terms.paymentMinor ??
    schedule.find((row) => row.paymentMinor > 0)?.paymentMinor ??
    remainingPrincipal;

  return {
    ok: true,
    paidCount: keptCount,
    remainingPrincipal,
    pendingIdsToDelete,
    keptDueDateUpdates,
    newSchedule: schedule,
    loanPaymentMinor,
    status: "active",
  };
}
