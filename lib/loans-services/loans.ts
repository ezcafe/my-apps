import { and, asc, eq, inArray, sql } from "drizzle-orm";
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
import {
  combineLoanProgressSeries,
  earliestNextDue,
  monthlyObligation,
  portfolioLtvPct,
  remainingByLoan,
  remainingTotal,
  weightedAprBps,
} from "@/lib/loans-insights";
import type { LoansWorkspaceCtx } from "@/lib/loans-services/types";
import { payInstallmentMoneyAtomic } from "@/lib/loans-services/pay";
import {
  loanCreateSchema,
} from "@/lib/validators/loans";
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
  nextScheduleInstallmentId: string | null;
  nextInstallmentNumber: number | null;
  moneyAccountId: string | null;
  moneyCategoryId: string | null;
};

export type SerializedLoanDetail = SerializedLoanListItem & {
  startDate: string;
  dueDayOfMonth: number;
  initialRateMonths: number | null;
  rateAfterInitialBps: number | null;
  paymentAfterRateChangeMinor: number | null;
  collateralValueMinor: number | null;
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
    initialRateMonths: parsed.data.initialRateMonths,
    rateAfterInitialBps: parsed.data.rateAfterInitialBps,
    paymentAfterRateChangeMinor: parsed.data.paymentAfterRateChangeMinor,
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
        calculationMethod: "sc_vn_actual_365",
        initialRateMonths: parsed.data.initialRateMonths ?? null,
        rateAfterInitialBps: parsed.data.rateAfterInitialBps ?? null,
        paymentAfterRateChangeMinor:
          parsed.data.paymentAfterRateChangeMinor ?? null,
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
      await payInstallmentMoneyAtomic(ctx, {
        scheduleInstallmentId: item.scheduleInstallmentId,
        moneyWorkspaceId,
        accountId: parsed.data.moneyAccountId!,
        categoryId: parsed.data.moneyCategoryId ?? undefined,
        amountMinor: item.paymentMinor,
        notes: `Loan: ${loanName}`,
        occurredAt: `${item.dueDate}T12:00:00.000Z`,
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
  nextPending: {
    dueDate: string;
    scheduleInstallmentId: string;
    installmentNumber: number;
  } | null,
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
    nextDueDate: nextPending?.dueDate ?? null,
    nextScheduleInstallmentId: nextPending?.scheduleInstallmentId ?? null,
    nextInstallmentNumber: nextPending?.installmentNumber ?? null,
    moneyAccountId: row.moneyAccountId,
    moneyCategoryId: row.moneyCategoryId,
  };
}

export async function listLoans(
  ctx: LoansWorkspaceCtx,
): Promise<SerializedLoanListItem[]> {
  const rows = await db
    .select()
    .from(loan)
    .where(
      and(
        eq(loan.workspaceId, ctx.workspaceId),
        inArray(loan.status, ["active", "paid_off"]),
      ),
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
      serializeListItem(
        row,
        summary,
        nextPending
          ? {
              dueDate: nextPending.dueDate,
              scheduleInstallmentId: nextPending.scheduleInstallmentId,
              installmentNumber: nextPending.installmentNumber,
            }
          : null,
      ),
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
  const base = serializeListItem(
    row,
    summary,
    nextPending
      ? {
          dueDate: nextPending.dueDate,
          scheduleInstallmentId: nextPending.scheduleInstallmentId,
          installmentNumber: nextPending.installmentNumber,
        }
      : null,
  );

  return {
    ...base,
    startDate: row.startDate,
    dueDayOfMonth: row.dueDayOfMonth,
    initialRateMonths: row.initialRateMonths,
    rateAfterInitialBps: row.rateAfterInitialBps,
    paymentAfterRateChangeMinor: row.paymentAfterRateChangeMinor,
    collateralValueMinor: row.collateralValueMinor,
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

export type LoansInsightsAtfPayload = {
  range: { from: string; to: string };
  summary: {
    remainingMinor: number;
    monthlyObligationMinor: number;
    weightedAprBps: number | null;
    nextDueDate: string | null;
    loanCount: number;
  };
  remainingByLoan: { id: string; label: string; valueMinor: number }[];
  paidPrincipalMinor: number;
  paidInterestMinor: number;
};

export type LoansInsightsMorePayload = {
  remainingInterestMinor: number;
  ltvPct: number | null;
  progress: Array<{
    id: string;
    name: string;
    remainingMinor: number;
    percentComplete: number;
  }>;
  combinedChart: ReturnType<typeof buildProgressChartSeries>;
};

async function loadWorkspaceLoans(workspaceId: string) {
  return db
    .select()
    .from(loan)
    .where(
      and(
        eq(loan.workspaceId, workspaceId),
        inArray(loan.status, ["active", "paid_off"]),
      ),
    )
    .orderBy(asc(loan.name));
}

async function loadInstallmentAggregatesForLoans(loanIds: string[]) {
  if (loanIds.length === 0) return [];
  const rows = await db.execute(sql`
    SELECT
      si.loan_id::text AS loan_id,
      COALESCE(SUM(CASE WHEN lis.status = 'paid' THEN si.principal_minor ELSE 0 END), 0)::int AS paid_principal,
      COALESCE(SUM(CASE WHEN lis.status = 'pending' THEN si.interest_minor ELSE 0 END), 0)::int AS remaining_interest,
      MIN(CASE WHEN lis.status = 'pending' THEN si.due_date END) AS next_due_date
    FROM loan_schedule_installment si
    INNER JOIN loan_installment_status lis
      ON lis.schedule_installment_id = si.id
    WHERE si.loan_id = ANY(${loanIds}::uuid[])
    GROUP BY si.loan_id
  `);
  return Array.from(
    rows as unknown as Iterable<{
      loan_id: string;
      paid_principal: number;
      remaining_interest: number;
      next_due_date: string | null;
    }>,
  );
}

async function loadPaidPrincipalInterestInRange(
  loanIds: string[],
  from: string,
  to: string,
) {
  if (loanIds.length === 0) {
    return { principalMinor: 0, interestMinor: 0 };
  }
  const rows = await db.execute(sql`
    SELECT
      COALESCE(SUM(si.principal_minor), 0)::int AS principal_minor,
      COALESCE(SUM(si.interest_minor), 0)::int AS interest_minor
    FROM loan_schedule_installment si
    INNER JOIN loan_installment_status lis
      ON lis.schedule_installment_id = si.id
    WHERE si.loan_id = ANY(${loanIds}::uuid[])
      AND lis.status = 'paid'
      AND lis.paid_at IS NOT NULL
      AND lis.paid_at >= ${from}::timestamptz
      AND lis.paid_at <= ${to}::timestamptz
  `);
  const row = Array.from(
    rows as unknown as Iterable<{
      principal_minor: number;
      interest_minor: number;
    }>,
  )[0];
  return {
    principalMinor: Number(row?.principal_minor ?? 0),
    interestMinor: Number(row?.interest_minor ?? 0),
  };
}

function summarizeLoanRowsFromAggregates(
  rows: Awaited<ReturnType<typeof loadWorkspaceLoans>>,
  aggregates: Awaited<ReturnType<typeof loadInstallmentAggregatesForLoans>>,
) {
  const byLoan = new Map(aggregates.map((a) => [a.loan_id, a]));
  return rows.map((row) => {
    const agg = byLoan.get(row.id);
    const paidPrincipal = Number(agg?.paid_principal ?? 0);
    const remainingMinor = Math.max(0, row.principalMinor - paidPrincipal);
    const percentComplete =
      row.principalMinor > 0
        ? Math.min(100, (paidPrincipal / row.principalMinor) * 100)
        : 100;
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      remainingMinor,
      paymentMinor: row.paymentMinor,
      annualRateBps: row.annualRateBps,
      nextDueDate: agg?.next_due_date ?? null,
      percentComplete,
      collateralValueMinor: row.collateralValueMinor,
      remainingInterestMinor: Number(agg?.remaining_interest ?? 0),
    };
  });
}

async function loadInstallmentsForLoans(loanIds: string[]) {
  if (loanIds.length === 0) return [];
  return db
    .select({
      loanId: loanScheduleInstallment.loanId,
      scheduleInstallmentId: loanScheduleInstallment.id,
      installmentNumber: loanScheduleInstallment.installmentNumber,
      dueDate: loanScheduleInstallment.dueDate,
      paymentMinor: loanScheduleInstallment.paymentMinor,
      principalMinor: loanScheduleInstallment.principalMinor,
      interestMinor: loanScheduleInstallment.interestMinor,
      balanceAfterMinor: loanScheduleInstallment.balanceAfterMinor,
      status: loanInstallmentStatus.status,
      paidAt: loanInstallmentStatus.paidAt,
    })
    .from(loanScheduleInstallment)
    .innerJoin(
      loanInstallmentStatus,
      eq(
        loanInstallmentStatus.scheduleInstallmentId,
        loanScheduleInstallment.id,
      ),
    )
    .where(inArray(loanScheduleInstallment.loanId, loanIds))
    .orderBy(asc(loanScheduleInstallment.installmentNumber));
}

async function loadSchedulesForLoans(loanIds: string[]) {
  if (loanIds.length === 0) return [];
  return db
    .select({
      loanId: loanScheduleInstallment.loanId,
      installmentNumber: loanScheduleInstallment.installmentNumber,
      dueDate: loanScheduleInstallment.dueDate,
      paymentMinor: loanScheduleInstallment.paymentMinor,
      principalMinor: loanScheduleInstallment.principalMinor,
      interestMinor: loanScheduleInstallment.interestMinor,
      balanceAfterMinor: loanScheduleInstallment.balanceAfterMinor,
    })
    .from(loanScheduleInstallment)
    .where(inArray(loanScheduleInstallment.loanId, loanIds))
    .orderBy(asc(loanScheduleInstallment.installmentNumber));
}

export async function loansInsightsAtf(
  ctx: LoansWorkspaceCtx,
  from: string,
  to: string,
): Promise<LoansInsightsAtfPayload> {
  const rows = await loadWorkspaceLoans(ctx.workspaceId);
  const loanIds = rows.map((r) => r.id);
  const [aggregates, paid] = await Promise.all([
    loadInstallmentAggregatesForLoans(loanIds),
    loadPaidPrincipalInterestInRange(loanIds, from, to),
  ]);
  const summarized = summarizeLoanRowsFromAggregates(rows, aggregates);
  return {
    range: { from, to },
    summary: {
      remainingMinor: remainingTotal(summarized),
      monthlyObligationMinor: monthlyObligation(summarized),
      weightedAprBps: weightedAprBps(summarized),
      nextDueDate: earliestNextDue(summarized),
      loanCount: rows.length,
    },
    remainingByLoan: remainingByLoan(summarized),
    paidPrincipalMinor: paid.principalMinor,
    paidInterestMinor: paid.interestMinor,
  };
}

export async function loansInsightsMore(
  ctx: LoansWorkspaceCtx,
  _from?: string,
  _to?: string,
): Promise<LoansInsightsMorePayload> {
  const rows = await loadWorkspaceLoans(ctx.workspaceId);
  const loanIds = rows.map((r) => r.id);
  const [aggregates, installments, schedules] = await Promise.all([
    loadInstallmentAggregatesForLoans(loanIds),
    loadInstallmentsForLoans(loanIds),
    loadSchedulesForLoans(loanIds),
  ]);
  const summarized = summarizeLoanRowsFromAggregates(rows, aggregates);
  const instByLoan = new Map<string, typeof installments>();
  for (const row of installments) {
    const list = instByLoan.get(row.loanId) ?? [];
    list.push(row);
    instByLoan.set(row.loanId, list);
  }
  const schedByLoan = new Map<string, typeof schedules>();
  for (const row of schedules) {
    const list = schedByLoan.get(row.loanId) ?? [];
    list.push(row);
    schedByLoan.set(row.loanId, list);
  }
  const charts = rows.map((row) => {
    const schedule = schedByLoan.get(row.id) ?? [];
    const inst = instByLoan.get(row.id) ?? [];
    return buildProgressChartSeries({
      principalMinor: row.principalMinor,
      schedule,
      installments: inst.map((i) => ({
        installmentNumber: i.installmentNumber,
        principalMinor: i.principalMinor,
        status: i.status,
        dueDate: i.dueDate,
      })),
    });
  });
  return {
    remainingInterestMinor: summarized.reduce(
      (sum, l) => sum + l.remainingInterestMinor,
      0,
    ),
    ltvPct: portfolioLtvPct(summarized),
    progress: summarized
      .filter((l) => l.status !== "paid_off")
      .map((l) => ({
        id: l.id,
        name: l.name,
        remainingMinor: l.remainingMinor,
        percentComplete: l.percentComplete,
      })),
    combinedChart: combineLoanProgressSeries(charts),
  };
}
