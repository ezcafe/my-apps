import { and, eq, sql } from "drizzle-orm";
import {
  db,
  setWorkspaceRlsConfig,
  withDbTransaction,
} from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";
import { assertWorkspaceMember } from "@/lib/workspace-context";
import type { LoansWorkspaceCtx } from "@/lib/loans-services/types";
import { createMoneyTransaction } from "@/lib/money-services/transactions";
import {
  loanInstallmentMarkPaidSchema,
  loanInstallmentPayWithTransactionSchema,
} from "@/lib/validators/loans";

async function lockPendingInstallment(
  loanWorkspaceId: string,
  scheduleInstallmentId: string,
): Promise<{
  loanId: string;
  loanName: string;
  paymentMinor: number;
}> {
  await setWorkspaceRlsConfig(loanWorkspaceId);
  const locked = await db.execute(sql`
    SELECT
      l.id::text AS loan_id,
      l.name AS loan_name,
      si.payment_minor AS payment_minor,
      lis.status AS status
    FROM loan_schedule_installment si
    INNER JOIN loan l ON l.id = si.loan_id
    INNER JOIN loan_installment_status lis
      ON lis.schedule_installment_id = si.id
    WHERE si.id = ${scheduleInstallmentId}::uuid
      AND l.workspace_id = ${loanWorkspaceId}::uuid
    FOR UPDATE OF lis
  `);
  const row = Array.from(
    locked as unknown as Iterable<{
      loan_id: string;
      loan_name: string;
      payment_minor: number;
      status: string;
    }>,
  )[0];
  if (!row) throw new Error("NOT_FOUND");
  if (row.status !== "pending") throw new Error("Installment is not pending");
  return {
    loanId: row.loan_id,
    loanName: row.loan_name,
    paymentMinor: Number(row.payment_minor),
  };
}

async function markInstallmentPaidInTx(
  loanWorkspaceId: string,
  scheduleInstallmentId: string,
  loanId: string,
  moneyTransactionId: string | null,
  paidWithoutTransaction: boolean,
): Promise<void> {
  await setWorkspaceRlsConfig(loanWorkspaceId);
  await db
    .update(loanInstallmentStatus)
    .set({
      status: "paid",
      paidAt: new Date(),
      paidWithoutTransaction,
      moneyTransactionId,
    })
    .where(
      eq(loanInstallmentStatus.scheduleInstallmentId, scheduleInstallmentId),
    );

  const pending = await db
    .select({ id: loanInstallmentStatus.scheduleInstallmentId })
    .from(loanInstallmentStatus)
    .innerJoin(
      loanScheduleInstallment,
      eq(
        loanInstallmentStatus.scheduleInstallmentId,
        loanScheduleInstallment.id,
      ),
    )
    .where(
      and(
        eq(loanScheduleInstallment.loanId, loanId),
        eq(loanInstallmentStatus.status, "pending"),
      ),
    )
    .limit(1);

  if (!pending.length) {
    await db
      .update(loan)
      .set({ status: "paid_off", updatedAt: new Date() })
      .where(eq(loan.id, loanId));
  }
}

export async function markLoanInstallmentPaid(
  ctx: LoansWorkspaceCtx,
  body: unknown,
): Promise<{ ok: true }> {
  const parsed = loanInstallmentMarkPaidSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  await withDbTransaction(async () => {
    const installment = await lockPendingInstallment(
      ctx.workspaceId,
      parsed.data.scheduleInstallmentId,
    );
    await markInstallmentPaidInTx(
      ctx.workspaceId,
      parsed.data.scheduleInstallmentId,
      installment.loanId,
      null,
      true,
    );
  });

  return { ok: true };
}

export async function payLoanInstallmentWithTransaction(
  ctx: LoansWorkspaceCtx,
  body: unknown,
): Promise<{ ok: true; moneyTransactionId: string }> {
  const parsed = loanInstallmentPayWithTransactionSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const moneyWorkspaceId =
    parsed.data.moneyWorkspaceId ?? ctx.workspaceId;

  const member = await assertWorkspaceMember(ctx.userSub, moneyWorkspaceId);
  if (!member) throw new Error("FORBIDDEN");

  return withDbTransaction(async () => {
    const installment = await lockPendingInstallment(
      ctx.workspaceId,
      parsed.data.scheduleInstallmentId,
    );

    const notes =
      parsed.data.notes?.trim() || `Loan: ${installment.loanName}`;
    const amountMinor = parsed.data.amountMinor ?? installment.paymentMinor;

    await setWorkspaceRlsConfig(moneyWorkspaceId);
    const tx = await createMoneyTransaction(
      { userSub: ctx.userSub, workspaceId: moneyWorkspaceId },
      {
        accountId: parsed.data.accountId,
        kind: "expense",
        amountMinor,
        categoryId: parsed.data.categoryId ?? undefined,
        notes,
        occurredAt: parsed.data.occurredAt ?? new Date().toISOString(),
      },
    );

    await markInstallmentPaidInTx(
      ctx.workspaceId,
      parsed.data.scheduleInstallmentId,
      installment.loanId,
      tx.id,
      false,
    );

    return { ok: true as const, moneyTransactionId: tx.id };
  });
}

/** Used by createLoan past-due auto-pay — one atomic money+status unit. */
export async function payInstallmentMoneyAtomic(
  ctx: LoansWorkspaceCtx,
  args: {
    scheduleInstallmentId: string;
    moneyWorkspaceId: string;
    accountId: string;
    categoryId?: string | null;
    amountMinor: number;
    notes: string;
    occurredAt: string;
  },
): Promise<{ moneyTransactionId: string }> {
  const member = await assertWorkspaceMember(ctx.userSub, args.moneyWorkspaceId);
  if (!member) throw new Error("FORBIDDEN");

  return withDbTransaction(async () => {
    const installment = await lockPendingInstallment(
      ctx.workspaceId,
      args.scheduleInstallmentId,
    );

    await setWorkspaceRlsConfig(args.moneyWorkspaceId);
    const tx = await createMoneyTransaction(
      { userSub: ctx.userSub, workspaceId: args.moneyWorkspaceId },
      {
        accountId: args.accountId,
        kind: "expense",
        amountMinor: args.amountMinor,
        categoryId: args.categoryId ?? undefined,
        notes: args.notes,
        occurredAt: args.occurredAt,
      },
    );

    await markInstallmentPaidInTx(
      ctx.workspaceId,
      args.scheduleInstallmentId,
      installment.loanId,
      tx.id,
      false,
    );

    return { moneyTransactionId: tx.id };
  });
}
