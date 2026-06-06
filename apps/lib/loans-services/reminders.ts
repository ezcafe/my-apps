import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";
import { workspaceMember } from "@/db/schema/workspace";
import { todayUtcDateString } from "@/lib/loans-services/due";

export type DueReminderRow = {
  scheduleInstallmentId: string;
  userSub: string;
  loanName: string;
  paymentMinor: number;
  currency: string;
  dueDate: string;
  loanId: string;
};

export async function listDueRemindersForCron(): Promise<DueReminderRow[]> {
  const today = todayUtcDateString();
  const rows = await db
    .select({
      scheduleInstallmentId: loanScheduleInstallment.id,
      userSub: workspaceMember.userSub,
      loanName: loan.name,
      paymentMinor: loanScheduleInstallment.paymentMinor,
      currency: loan.currency,
      dueDate: loanScheduleInstallment.dueDate,
      loanId: loan.id,
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
    .innerJoin(
      workspaceMember,
      eq(workspaceMember.workspaceId, loan.workspaceId),
    )
    .where(
      and(
        eq(loan.status, "active"),
        eq(loanInstallmentStatus.status, "pending"),
        lte(loanScheduleInstallment.dueDate, today),
        or(
          isNull(loanInstallmentStatus.lastNotifiedAt),
          sql`${loanInstallmentStatus.lastNotifiedAt}::date < ${today}::date`,
        ),
      ),
    );

  return rows;
}

export async function markInstallmentNotified(
  scheduleInstallmentId: string,
): Promise<void> {
  await db
    .update(loanInstallmentStatus)
    .set({ lastNotifiedAt: new Date() })
    .where(eq(loanInstallmentStatus.scheduleInstallmentId, scheduleInstallmentId));
}
