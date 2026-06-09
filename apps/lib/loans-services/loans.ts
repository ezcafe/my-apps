import { and, asc, eq } from "drizzle-orm";
import { db, runInWorkspace } from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";
import { moneyAccount, moneyCategory } from "@/db/schema/money";
import {
  buildAmortizationSchedule,
  buildProgressChartSeries,
  computeLoanSummary,
  type AmortizationScheduleRow,
} from "@/lib/loans-amortization";
import type { LoansWorkspaceCtx } from "@/lib/loans-services/types";
import {
  loanCreateSchema,
} from "@/lib/validators/loans";
import { createMoneyTransaction } from "@/lib/money-services/transactions";
import { assertWorkspaceMember } from "@/lib/workspace-context";
import { getWorkspaceDefaultCurrency } from "@/lib/workspace-loans";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type SerializedLoanListItem = {
  id: string;
  name: string;
  currency: string;
  principalMinor: number;
  annualRateBps: number;
  termMonths: number;
  paymentMinor: number;
  calculationMethod: string;
  status: string;
  percentComplete: number;
  remainingMinor: number;
  nextDueDate: string | null;
};

export type SerializedLoanDetail = SerializedLoanListItem & {
  startDate: string;
  dueDayOfMonth: number;
  collateralValueMinor: number | null;
  moneyAccountId: string | null;
  moneyCategoryId: string | null;
  summary: {
    totalPaidMinor: number;
    remainingMinor: number;
    percentComplete: number;
    projectedPayoffDate: string | null;
    monthsAheadBehind: number;
  };
  chart: ReturnType<typeof buildProgressChartSeries>;
  installments: Array<{
    scheduleInstallmentId: string;
    installmentNumber: number;
    dueDate: string;
    paymentMinor: number;
    principalMinor: number;
    interestMinor: number;
    balanceAfterMinor: number;
    status: string;
    paidAt: string | null;
    moneyTransactionId: string | null;
    paidWithoutTransaction: boolean;
  }>;
};

async function validateMoneyLinks(
  moneyWorkspaceId: string,
  accountId: string | null | undefined,
  categoryId: string | null | undefined,
): Promise<void> {
  if (accountId) {
    const rows = await db
      .select({ id: moneyAccount.id })
      .from(moneyAccount)
      .where(
        and(
          eq(moneyAccount.id, accountId),
          eq(moneyAccount.workspaceId, moneyWorkspaceId),
        ),
      )
      .limit(1);
    if (!rows.length) throw new Error("Invalid money account");
  }
  if (categoryId) {
    const rows = await db
      .select({ id: moneyCategory.id })
      .from(moneyCategory)
      .where(
        and(
          eq(moneyCategory.id, categoryId),
          eq(moneyCategory.workspaceId, moneyWorkspaceId),
        ),
      )
      .limit(1);
    if (!rows.length) throw new Error("Invalid money category");
  }
}

export async function createLoan(
  ctx: LoansWorkspaceCtx,
  body: unknown,
  moneyWorkspaceId?: string | null,
): Promise<{ id: string }> {
  const parsed = loanCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  if (moneyWorkspaceId && (parsed.data.moneyAccountId || parsed.data.moneyCategoryId)) {
    await validateMoneyLinks(
      moneyWorkspaceId,
      parsed.data.moneyAccountId,
      parsed.data.moneyCategoryId,
    );
  }

  const autoMarkPastDuePaid = parsed.data.autoMarkPastDuePaid ?? false;
  const autoMarkPastDueWithoutTransaction =
    parsed.data.autoMarkPastDueWithoutTransaction ?? true;

  if (autoMarkPastDuePaid && !autoMarkPastDueWithoutTransaction) {
    if (!moneyWorkspaceId) {
      throw new Error("Money workspace required to create transactions for past-due installments");
    }
    if (!parsed.data.moneyAccountId) {
      throw new Error("Money account required to create transactions for past-due installments");
    }
    await validateMoneyLinks(
      moneyWorkspaceId,
      parsed.data.moneyAccountId,
      parsed.data.moneyCategoryId,
    );
    const member = await assertWorkspaceMember(ctx.userSub, moneyWorkspaceId);
    if (!member) throw new Error("FORBIDDEN");
  }

  const currency =
    (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";
  const schedule = buildAmortizationSchedule({
    principalMinor: parsed.data.principalMinor,
    annualRateBps: parsed.data.annualRateBps,
    termMonths: parsed.data.termMonths,
    startDate: parsed.data.startDate,
    dueDayOfMonth: parsed.data.dueDayOfMonth,
    paymentMinor: parsed.data.paymentMinor,
    calculationMethod: parsed.data.calculationMethod,
  });
  const paymentMinor =
    parsed.data.paymentMinor ??
    schedule.find((row) => row.paymentMinor > 0)?.paymentMinor ??
    parsed.data.principalMinor;

  const today = todayIso();
  type PendingMoneyTx = {
    scheduleInstallmentId: string;
    dueDate: string;
    paymentMinor: number;
  };
  const pendingMoneyTx: PendingMoneyTx[] = [];

  const { id: loanId } = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(loan)
      .values({
        workspaceId: ctx.workspaceId,
        name: parsed.data.name,
        currency,
        principalMinor: parsed.data.principalMinor,
        annualRateBps: parsed.data.annualRateBps,
        termMonths: parsed.data.termMonths,
        startDate: parsed.data.startDate,
        dueDayOfMonth: parsed.data.dueDayOfMonth,
        paymentMinor,
        calculationMethod: parsed.data.calculationMethod,
        collateralValueMinor: parsed.data.collateralValueMinor ?? null,
        moneyAccountId: parsed.data.moneyAccountId ?? null,
        moneyCategoryId: parsed.data.moneyCategoryId ?? null,
        status: "active",
      })
      .returning({ id: loan.id });

    if (!inserted) throw new Error("Failed to create loan");

    let autoMarkedCount = 0;

    for (const row of schedule) {
      const [sched] = await tx
        .insert(loanScheduleInstallment)
        .values({
          loanId: inserted.id,
          installmentNumber: row.installmentNumber,
          dueDate: row.dueDate,
          paymentMinor: row.paymentMinor,
          principalMinor: row.principalMinor,
          interestMinor: row.interestMinor,
          balanceAfterMinor: row.balanceAfterMinor,
        })
        .returning({ id: loanScheduleInstallment.id });

      if (!sched) throw new Error("Failed to create schedule row");

      const isPastDue = row.dueDate <= today;
      const autoMark =
        autoMarkPastDuePaid && isPastDue && autoMarkPastDueWithoutTransaction;

      if (autoMark) {
        autoMarkedCount += 1;
        await tx.insert(loanInstallmentStatus).values({
          scheduleInstallmentId: sched.id,
          status: "paid",
          paidAt: new Date(),
          paidWithoutTransaction: true,
          moneyTransactionId: null,
        });
      } else {
        await tx.insert(loanInstallmentStatus).values({
          scheduleInstallmentId: sched.id,
          status: "pending",
        });
        if (autoMarkPastDuePaid && isPastDue && !autoMarkPastDueWithoutTransaction) {
          pendingMoneyTx.push({
            scheduleInstallmentId: sched.id,
            dueDate: row.dueDate,
            paymentMinor: row.paymentMinor,
          });
        }
      }
    }

    if (autoMarkedCount === schedule.length) {
      await tx
        .update(loan)
        .set({ status: "paid_off", updatedAt: new Date() })
        .where(eq(loan.id, inserted.id));
    }

    return { id: inserted.id };
  });

  if (pendingMoneyTx.length > 0 && moneyWorkspaceId) {
    const loanName = parsed.data.name;
    for (const item of pendingMoneyTx) {
      const moneyTx = await runInWorkspace(moneyWorkspaceId, () =>
        createMoneyTransaction(
          { userSub: ctx.userSub, workspaceId: moneyWorkspaceId },
          {
            accountId: parsed.data.moneyAccountId!,
            kind: "expense",
            amountMinor: item.paymentMinor,
            categoryId: parsed.data.moneyCategoryId ?? undefined,
            notes: `Loan: ${loanName}`,
            occurredAt: `${item.dueDate}T12:00:00.000Z`,
          },
        ),
      );

      await runInWorkspace(ctx.workspaceId, async () => {
        await db
          .update(loanInstallmentStatus)
          .set({
            status: "paid",
            paidAt: new Date(),
            paidWithoutTransaction: false,
            moneyTransactionId: moneyTx.id,
          })
          .where(
            eq(
              loanInstallmentStatus.scheduleInstallmentId,
              item.scheduleInstallmentId,
            ),
          );
      });
    }

    if (pendingMoneyTx.length === schedule.length) {
      await runInWorkspace(ctx.workspaceId, async () => {
        await db
          .update(loan)
          .set({ status: "paid_off", updatedAt: new Date() })
          .where(eq(loan.id, loanId));
      });
    }
  }

  return { id: loanId };
}

async function loadLoanSchedule(loanId: string): Promise<AmortizationScheduleRow[]> {
  const rows = await db
    .select({
      installmentNumber: loanScheduleInstallment.installmentNumber,
      dueDate: loanScheduleInstallment.dueDate,
      paymentMinor: loanScheduleInstallment.paymentMinor,
      principalMinor: loanScheduleInstallment.principalMinor,
      interestMinor: loanScheduleInstallment.interestMinor,
      balanceAfterMinor: loanScheduleInstallment.balanceAfterMinor,
    })
    .from(loanScheduleInstallment)
    .where(eq(loanScheduleInstallment.loanId, loanId))
    .orderBy(asc(loanScheduleInstallment.installmentNumber));

  return rows;
}

async function loadInstallmentStates(loanId: string) {
  return db
    .select({
      scheduleInstallmentId: loanScheduleInstallment.id,
      installmentNumber: loanScheduleInstallment.installmentNumber,
      dueDate: loanScheduleInstallment.dueDate,
      paymentMinor: loanScheduleInstallment.paymentMinor,
      principalMinor: loanScheduleInstallment.principalMinor,
      interestMinor: loanScheduleInstallment.interestMinor,
      balanceAfterMinor: loanScheduleInstallment.balanceAfterMinor,
      status: loanInstallmentStatus.status,
      paidAt: loanInstallmentStatus.paidAt,
      moneyTransactionId: loanInstallmentStatus.moneyTransactionId,
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
    .where(eq(loanScheduleInstallment.loanId, loanId))
    .orderBy(asc(loanScheduleInstallment.installmentNumber));
}

function serializeListItem(
  row: typeof loan.$inferSelect,
  summary: ReturnType<typeof computeLoanSummary>,
  nextDueDate: string | null,
): SerializedLoanListItem {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    principalMinor: row.principalMinor,
    annualRateBps: row.annualRateBps,
    termMonths: row.termMonths,
    paymentMinor: row.paymentMinor,
    calculationMethod: row.calculationMethod,
    status: row.status,
    percentComplete: summary.percentComplete,
    remainingMinor: summary.remainingMinor,
    nextDueDate,
  };
}

export async function listLoans(
  ctx: LoansWorkspaceCtx,
): Promise<SerializedLoanListItem[]> {
  const rows = await db
    .select()
    .from(loan)
    .where(
      and(eq(loan.workspaceId, ctx.workspaceId), eq(loan.status, "active")),
    )
    .orderBy(asc(loan.name));

  const out: SerializedLoanListItem[] = [];
  for (const row of rows) {
    const schedule = await loadLoanSchedule(row.id);
    const installments = await loadInstallmentStates(row.id);
    const paymentStates = installments.map((i) => ({
      installmentNumber: i.installmentNumber,
      principalMinor: i.principalMinor,
      status: i.status,
      dueDate: i.dueDate,
    }));
    const summary = computeLoanSummary({
      principalMinor: row.principalMinor,
      schedule,
      installments: paymentStates,
    });
    const nextPending = installments.find((i) => i.status === "pending");
    out.push(
      serializeListItem(row, summary, nextPending?.dueDate ?? null),
    );
  }
  return out;
}

export async function getLoanDetail(
  ctx: LoansWorkspaceCtx,
  loanId: string,
): Promise<SerializedLoanDetail> {
  const rows = await db
    .select()
    .from(loan)
    .where(and(eq(loan.id, loanId), eq(loan.workspaceId, ctx.workspaceId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("NOT_FOUND");

  const schedule = await loadLoanSchedule(loanId);
  const installments = await loadInstallmentStates(loanId);
  const paymentStates = installments.map((i) => ({
    installmentNumber: i.installmentNumber,
    principalMinor: i.principalMinor,
    status: i.status,
    dueDate: i.dueDate,
  }));
  const summary = computeLoanSummary({
    principalMinor: row.principalMinor,
    schedule,
    installments: paymentStates,
  });
  const chart = buildProgressChartSeries({
    schedule,
    installments: paymentStates,
    principalMinor: row.principalMinor,
  });

  const nextPending = installments.find((i) => i.status === "pending");
  const base = serializeListItem(row, summary, nextPending?.dueDate ?? null);

  return {
    ...base,
    startDate: row.startDate,
    dueDayOfMonth: row.dueDayOfMonth,
    collateralValueMinor: row.collateralValueMinor,
    moneyAccountId: row.moneyAccountId,
    moneyCategoryId: row.moneyCategoryId,
    summary: {
      totalPaidMinor: summary.totalPaidMinor,
      remainingMinor: summary.remainingMinor,
      percentComplete: summary.percentComplete,
      projectedPayoffDate: summary.projectedPayoffDate,
      monthsAheadBehind: summary.monthsAheadBehind,
    },
    chart,
    installments: installments.map((i) => ({
      scheduleInstallmentId: i.scheduleInstallmentId,
      installmentNumber: i.installmentNumber,
      dueDate: i.dueDate,
      paymentMinor: i.paymentMinor,
      principalMinor: i.principalMinor,
      interestMinor: i.interestMinor,
      balanceAfterMinor: i.balanceAfterMinor,
      status: i.status,
      paidAt: i.paidAt?.toISOString() ?? null,
      moneyTransactionId: i.moneyTransactionId,
      paidWithoutTransaction: i.paidWithoutTransaction,
    })),
  };
}

export async function cancelLoan(
  ctx: LoansWorkspaceCtx,
  loanId: string,
): Promise<{ ok: true }> {
  const updated = await db
    .update(loan)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(loan.id, loanId), eq(loan.workspaceId, ctx.workspaceId)))
    .returning({ id: loan.id });
  if (!updated.length) throw new Error("NOT_FOUND");
  return { ok: true };
}
