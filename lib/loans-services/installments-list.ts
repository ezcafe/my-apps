import { and, asc, eq, gt, gte, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";
import {
  decodeLoansInstallmentCursor,
  encodeLoansInstallmentCursor,
  type LoansInstallmentKeyset,
} from "@/lib/loans-installment-cursor";
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
  paidWithoutTransaction: boolean;
};

export type LoansInstallmentsConnection = {
  items: LoansInstallmentListRow[];
  nextCursor: string | null;
};

/** Pure: row is strictly after keyset (installmentNumber ASC, id ASC). */
export function loansInstallmentKeysetAfter(
  row: LoansInstallmentKeyset,
  cursor: LoansInstallmentKeyset,
): boolean {
  if (row.installmentNumber > cursor.installmentNumber) return true;
  if (row.installmentNumber < cursor.installmentNumber) return false;
  return row.id > cursor.id;
}

/** Pure filter for unit tests — mirrors DB where clauses. */
export function installmentRowMatchesQuery(
  row: {
    loanId: string;
    dueDate: string;
    status: string;
    scheduleInstallmentId: string;
    installmentNumber?: number;
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
  if (query.cursor) {
    const key = decodeLoansInstallmentCursor(query.cursor);
    if (!key) return false;
    if (row.installmentNumber == null) return false;
    return loansInstallmentKeysetAfter(
      { installmentNumber: row.installmentNumber, id: row.scheduleInstallmentId },
      key,
    );
  }
  return true;
}

function keysetSql(cursor: LoansInstallmentKeyset): SQL {
  return or(
    gt(loanScheduleInstallment.installmentNumber, cursor.installmentNumber),
    and(
      eq(loanScheduleInstallment.installmentNumber, cursor.installmentNumber),
      gt(loanScheduleInstallment.id, cursor.id),
    ),
  )!;
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
    const key = decodeLoansInstallmentCursor(query.cursor);
    if (key) {
      conditions.push(keysetSql(key));
    }
    // Legacy / malformed cursor → treat as start of list (no keyset filter).
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
      paidWithoutTransaction: loanInstallmentStatus.paidWithoutTransaction,
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
    .orderBy(
      asc(loanScheduleInstallment.installmentNumber),
      asc(loanScheduleInstallment.id),
    )
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const items: LoansInstallmentListRow[] = slice.map((row) => ({
    ...row,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  }));
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeLoansInstallmentCursor({
          installmentNumber: last.installmentNumber,
          id: last.scheduleInstallmentId,
        })
      : null;
  return { items, nextCursor };
}
