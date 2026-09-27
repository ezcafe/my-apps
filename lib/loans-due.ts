/** Minimal loan fields needed for overdue / due-soon math. */
export type LoanDueFields = {
  status: string;
  nextDueDate: string | null;
};

/** Calendar-day distance from todayIso to dueDate (noon anchors avoid DST skew). */
export function daysUntilDue(dueDate: string, todayIso: string): number {
  const due = new Date(`${dueDate}T12:00:00`);
  const today = new Date(`${todayIso}T12:00:00`);
  return Math.round(
    (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
}

export function isOverdue(loan: LoanDueFields, todayIso: string): boolean {
  return (
    loan.status !== "paid_off" &&
    Boolean(loan.nextDueDate) &&
    daysUntilDue(loan.nextDueDate!, todayIso) < 0
  );
}

/** Due within 0…7 days inclusive; overdue loans are never due-soon. */
export function isDueSoon(loan: LoanDueFields, todayIso: string): boolean {
  if (loan.status === "paid_off" || !loan.nextDueDate) return false;
  const days = daysUntilDue(loan.nextDueDate, todayIso);
  return days >= 0 && days <= 7;
}

export function countLoansDueUrgency(
  loans: readonly LoanDueFields[],
  todayIso: string,
): { overdue: number; dueSoon: number } {
  let overdue = 0;
  let dueSoon = 0;
  for (const loan of loans) {
    if (isOverdue(loan, todayIso)) overdue += 1;
    else if (isDueSoon(loan, todayIso)) dueSoon += 1;
  }
  return { overdue, dueSoon };
}
