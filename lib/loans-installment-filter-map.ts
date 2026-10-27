/**
 * Loan detail installment filter chips → listLoansInstallments status.
 * Pure helper — unit-tested; UI must not invent a different map.
 */

export type LoanInstallmentsTableFilter = "all" | "upcoming" | "paid";

export type LoansInstallmentListStatus = "pending" | "paid" | "skipped";

/**
 * Map UI chip → optional list `status`.
 * `all` omits status (undefined).
 */
export function loanInstallmentsFilterToStatus(
  filter: LoanInstallmentsTableFilter,
): LoansInstallmentListStatus | undefined {
  if (filter === "upcoming") return "pending";
  if (filter === "paid") return "paid";
  return undefined;
}
