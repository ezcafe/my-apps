/**
 * Pure helpers for slim LoanDetail client contract (Task 4).
 * Caption / payment card read these fields — not a full installments array.
 */

export type LoanInstallmentStateLike = {
  status: string;
  dueDate: string;
  paymentMinor: number;
  scheduleInstallmentId: string;
  installmentNumber: number;
};

export function todayIsoDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function countLoanInstallmentsForDetail(
  installments: ReadonlyArray<LoanInstallmentStateLike>,
  today: string = todayIsoDate(),
): {
  installmentCount: number;
  paidInstallmentCount: number;
  overdueInstallmentCount: number;
} {
  let paidInstallmentCount = 0;
  let overdueInstallmentCount = 0;
  for (const row of installments) {
    if (row.status === "paid") paidInstallmentCount += 1;
    if (row.status === "pending" && row.dueDate < today) {
      overdueInstallmentCount += 1;
    }
  }
  return {
    installmentCount: installments.length,
    paidInstallmentCount,
    overdueInstallmentCount,
  };
}

export function nextPendingInstallment(
  installments: ReadonlyArray<LoanInstallmentStateLike>,
): LoanInstallmentStateLike | null {
  return installments.find((i) => i.status === "pending") ?? null;
}
