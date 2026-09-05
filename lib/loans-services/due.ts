import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";

export function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function countDueLoanInstallments(workspaceId: string): Promise<number> {
  const today = todayUtcDateString();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loanInstallmentStatus)
    .innerJoin(
      loanScheduleInstallment,
      eq(
        loanInstallmentStatus.scheduleInstallmentId,
        loanScheduleInstallment.id,
      ),
    )
    .innerJoin(loan, eq(loanScheduleInstallment.loanId, loan.id))
    .where(
      and(
        eq(loan.workspaceId, workspaceId),
        eq(loan.status, "active"),
        eq(loanInstallmentStatus.status, "pending"),
        lte(loanScheduleInstallment.dueDate, today),
      ),
    );
  return rows[0]?.count ?? 0;
}

export type DueInstallmentRow = {
  scheduleInstallmentId: string;
  loanId: string;
  loanName: string;
  installmentNumber: number;
  dueDate: string;
  paymentMinor: number;
  currency: string;
  moneyAccountId: string | null;
  moneyCategoryId: string | null;
};

export async function listDueInstallments(
  workspaceId: string,
): Promise<DueInstallmentRow[]> {
  const today = todayUtcDateString();
  return db
    .select({
      scheduleInstallmentId: loanScheduleInstallment.id,
      loanId: loan.id,
      loanName: loan.name,
      installmentNumber: loanScheduleInstallment.installmentNumber,
      dueDate: loanScheduleInstallment.dueDate,
      paymentMinor: loanScheduleInstallment.paymentMinor,
      currency: loan.currency,
      moneyAccountId: loan.moneyAccountId,
      moneyCategoryId: loan.moneyCategoryId,
    })
    .from(loanInstallmentStatus)
    .innerJoin(
      loanScheduleInstallment,
      eq(
        loanInstallmentStatus.scheduleInstallmentId,
        loanScheduleInstallment.id,
      ),
    )
    .innerJoin(loan, eq(loanScheduleInstallment.loanId, loan.id))
    .where(
      and(
        eq(loan.workspaceId, workspaceId),
        eq(loan.status, "active"),
        eq(loanInstallmentStatus.status, "pending"),
        lte(loanScheduleInstallment.dueDate, today),
      ),
    )
    .orderBy(loanScheduleInstallment.dueDate);
}

/** Slim upcoming row for kiosk — only fields the payments card renders. */
export type UpcomingLoanPaymentRow = {
  id: string;
  name: string;
  nextDueDate: string;
  paymentMinor: number;
  currency: string;
};

/**
 * Top-N active loans by earliest pending due date.
 * Avoids full `listLoans` (all installments + summary math) for the kiosk strip.
 */
export async function listUpcomingLoanPayments(
  workspaceId: string,
  limit = 5,
): Promise<UpcomingLoanPaymentRow[]> {
  const rows = await db
    .select({
      id: loan.id,
      name: loan.name,
      nextDueDate: loanScheduleInstallment.dueDate,
      paymentMinor: loan.paymentMinor,
      currency: loan.currency,
    })
    .from(loanInstallmentStatus)
    .innerJoin(
      loanScheduleInstallment,
      eq(
        loanInstallmentStatus.scheduleInstallmentId,
        loanScheduleInstallment.id,
      ),
    )
    .innerJoin(loan, eq(loanScheduleInstallment.loanId, loan.id))
    .where(
      and(
        eq(loan.workspaceId, workspaceId),
        eq(loan.status, "active"),
        eq(loanInstallmentStatus.status, "pending"),
      ),
    )
    .orderBy(
      asc(loanScheduleInstallment.dueDate),
      asc(loanScheduleInstallment.installmentNumber),
    );

  const seen = new Set<string>();
  const out: UpcomingLoanPaymentRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({
      id: row.id,
      name: row.name,
      nextDueDate: row.nextDueDate,
      paymentMinor: row.paymentMinor,
      currency: row.currency,
    });
    if (out.length >= limit) break;
  }
  return out;
}
