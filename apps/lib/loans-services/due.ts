import { and, eq, lte, sql } from "drizzle-orm";
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
