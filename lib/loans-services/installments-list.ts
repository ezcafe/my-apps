import { and, asc, eq, gt, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";
import {
  loansInstallmentsQuerySchema,
  type LoansInstallmentsQueryInput,
} from "@/lib/validators/loans";

export type LoansInstallmentListRow = {
  scheduleInstallmentId: string;
  loanId: string;
  loanName: string;
  installmentNumber: number;
  dueDate: string;
  paymentMinor: number;
  principalMinor: number;
  interestMinor: number;
  balanceAfterMinor: number;
  status: string;
  paidAt: string | null;
  currency: string;
};

export type LoansInstallmentsConnection = {
  items: LoansInstallmentListRow[];
  nextCursor: string | null;
};

/** Pure filter for unit tests — mirrors DB where clauses on dueDate/status/loanId. */
export function installmentRowMatchesQuery(
  row: {
    loanId: string;
    dueDate: string;
    status: string;
    scheduleInstallmentId: string;
  },
  query: Pick<
    LoansInstallmentsQueryInput,
    "loanId" | "from" | "to" | "status" | "cursor"
  >,
): boolean {
  if (query.loanId && row.loanId !== query.loanId) return false;
  if (query.from && row.dueDate < query.from) return false;
  if (query.to && row.dueDate > query.to) return false;
  if (query.status && row.status !== query.status) return false;
  if (query.cursor && row.scheduleInstallmentId <= query.cursor) return false;
  return true;
}

export async function listLoansInstallments(
  workspaceId: string,
  rawQuery: unknown,
): Promise<LoansInstallmentsConnection> {
  const query = loansInstallmentsQuerySchema.parse(rawQuery ?? {});
  const limit = query.limit ?? 50;

  const conditions: SQL[] = [eq(loan.workspaceId, workspaceId)];
  if (query.loanId) {
    conditions.push(eq(loanScheduleInstallment.loanId, query.loanId));
  }
  if (query.from) {
    conditions.push(gte(loanScheduleInstallment.dueDate, query.from));
  }
  if (query.to) {
    conditions.push(lte(loanScheduleInstallment.dueDate, query.to));
  }
  if (query.status) {
    conditions.push(eq(loanInstallmentStatus.status, query.status));
  }
  if (query.cursor) {
    conditions.push(gt(loanScheduleInstallment.id, query.cursor));
  }

  const rows = await db
    .select({
      scheduleInstallmentId: loanScheduleInstallment.id,
      loanId: loan.id,
      loanName: loan.name,
      installmentNumber: loanScheduleInstallment.installmentNumber,
      dueDate: loanScheduleInstallment.dueDate,
      paymentMinor: loanScheduleInstallment.paymentMinor,
      principalMinor: loanScheduleInstallment.principalMinor,
      interestMinor: loanScheduleInstallment.interestMinor,
      balanceAfterMinor: loanScheduleInstallment.balanceAfterMinor,
      status: loanInstallmentStatus.status,
      paidAt: loanInstallmentStatus.paidAt,
      currency: loan.currency,
    })
    .from(loanScheduleInstallment)
    .innerJoin(
      loanInstallmentStatus,
      eq(
        loanInstallmentStatus.scheduleInstallmentId,
        loanScheduleInstallment.id,
      ),
    )
    .innerJoin(loan, eq(loanScheduleInstallment.loanId, loan.id))
    .where(and(...conditions))
    .orderBy(asc(loanScheduleInstallment.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const items: LoansInstallmentListRow[] = slice.map((row) => ({
    ...row,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  }));
  const nextCursor = hasMore
    ? (items[items.length - 1]?.scheduleInstallmentId ?? null)
    : null;
  return { items, nextCursor };
}
