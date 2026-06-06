import { and, eq } from "drizzle-orm";
import { db, runInWorkspace } from "@/db";
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

async function getPendingInstallment(
  ctx: LoansWorkspaceCtx,
  scheduleInstallmentId: string,
) {
  const rows = await db
    .select({
      scheduleInstallmentId: loanScheduleInstallment.id,
      loanId: loan.id,
      loanName: loan.name,
      paymentMinor: loanScheduleInstallment.paymentMinor,
      status: loanInstallmentStatus.status,
      workspaceId: loan.workspaceId,
    })
    .from(loanScheduleInstallment)
    .innerJoin(loan, eq(loanScheduleInstallment.loanId, loan.id))
    .innerJoin(
      loanInstallmentStatus,
      eq(
        loanInstallmentStatus.scheduleInstallmentId,
        loanScheduleInstallment.id,
      ),
    )
    .where(
      and(
        eq(loanScheduleInstallment.id, scheduleInstallmentId),
        eq(loan.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) throw new Error("NOT_FOUND");
  if (row.status !== "pending") throw new Error("Installment is not pending");
  return row;
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

  await getPendingInstallment(ctx, parsed.data.scheduleInstallmentId);

  await runInWorkspace(ctx.workspaceId, async () => {
    await db
      .update(loanInstallmentStatus)
      .set({
        status: "paid",
        paidAt: new Date(),
        paidWithoutTransaction: true,
        moneyTransactionId: null,
      })
      .where(
        eq(
          loanInstallmentStatus.scheduleInstallmentId,
          parsed.data.scheduleInstallmentId,
        ),
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

  const installment = await getPendingInstallment(
    ctx,
    parsed.data.scheduleInstallmentId,
  );

  const member = await assertWorkspaceMember(
    ctx.userSub,
    parsed.data.moneyWorkspaceId,
  );
  if (!member) throw new Error("FORBIDDEN");

  const notes =
    parsed.data.notes?.trim() ||
    `Loan: ${installment.loanName}`;

  const amountMinor = parsed.data.amountMinor ?? installment.paymentMinor;

  const tx = await runInWorkspace(parsed.data.moneyWorkspaceId, () =>
    createMoneyTransaction(
      { userSub: ctx.userSub, workspaceId: parsed.data.moneyWorkspaceId },
      {
        accountId: parsed.data.accountId,
        kind: "expense",
        amountMinor,
        categoryId: parsed.data.categoryId ?? undefined,
        notes,
        occurredAt: parsed.data.occurredAt ?? new Date().toISOString(),
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
        moneyTransactionId: tx.id,
      })
      .where(
        eq(
          loanInstallmentStatus.scheduleInstallmentId,
          parsed.data.scheduleInstallmentId,
        ),
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
          eq(loanScheduleInstallment.loanId, installment.loanId),
          eq(loanInstallmentStatus.status, "pending"),
        ),
      )
      .limit(1);

    if (!pending.length) {
      await db
        .update(loan)
        .set({ status: "paid_off", updatedAt: new Date() })
        .where(eq(loan.id, installment.loanId));
    }
  });

  return { ok: true, moneyTransactionId: tx.id };
}
