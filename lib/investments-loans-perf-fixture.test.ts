import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";
import { moneyAccount, moneyTransaction } from "@/db/schema/money";
import { workspace } from "@/db/schema/workspace";
import {
  cleanupInvestmentsLoansPerfFixture,
  INVESTMENTS_LOANS_PERF_FIXTURE_MIN_INSTALLMENTS,
  INVESTMENTS_LOANS_PERF_FIXTURE_MIN_TX,
  INVESTMENTS_LOANS_PERF_OWNER_SUB,
  investmentsLoansPerfMeasureWindow,
  seedInvestmentsLoansPerfFixture,
} from "@/lib/investments-loans-perf-fixture";
import { moneyLedgerFirstLoadFilterQuery } from "@/lib/money-first-load-filters";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";
import { moneyTransactionsListQueryInput } from "@/lib/money-query-options";
import { listLoansInstallments } from "@/lib/loans-services/installments-list";

describe("investmentsLoansPerfMeasureWindow", () => {
  it("matches MONEY_LEDGER_INVESTMENT first-load current-month bounds", () => {
    const now = new Date("2026-10-15T12:00:00");
    const window = investmentsLoansPerfMeasureWindow(now);
    const filterQuery = moneyLedgerFirstLoadFilterQuery(
      MONEY_LEDGER_INVESTMENT,
      [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "investment" }],
      [],
      now,
    );
    const input = moneyTransactionsListQueryInput(
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
    );
    assert.equal(window.from, input.from);
    assert.equal(window.to, input.to);
  });
});

describe("seedInvestmentsLoansPerfFixture", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  it("default targets cover page-1 hasMore for loans and investment volume", () => {
    assert.ok(INVESTMENTS_LOANS_PERF_FIXTURE_MIN_TX >= 100);
    assert.ok(INVESTMENTS_LOANS_PERF_FIXTURE_MIN_INSTALLMENTS > 50);
  });

  it(
    "is idempotent, cleans up, and seeds list-visible investment + loan rows",
    { skip: !hasDb },
    async () => {
      const now = new Date("2026-10-15T12:00:00");
      const txCount = 40;
      const installmentCount = 60;

      const ownerSub = `${INVESTMENTS_LOANS_PERF_OWNER_SUB}-fixture-unit`;
      const first = await seedInvestmentsLoansPerfFixture({
        now,
        txCount,
        installmentCount,
        workspaceId: "b2000000-0000-4000-8000-0000000000f1",
        ownerSub,
      });
      assert.equal(first.ownerSub, ownerSub);
      assert.equal(first.txCount, txCount);
      assert.equal(first.installmentCount, installmentCount);

      const second = await seedInvestmentsLoansPerfFixture({
        now,
        txCount,
        installmentCount,
        workspaceId: "b2000000-0000-4000-8000-0000000000f1",
        ownerSub,
      });
      assert.equal(second.workspaceId, first.workspaceId);
      assert.equal(second.installmentCount, installmentCount);
      // Loan id is fresh each seed (cleanup + recreate); workspace stays stable.

      const workspaces = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.ownedByUserSub, ownerSub));
      assert.equal(workspaces.length, 1);

      const filterQuery = moneyLedgerFirstLoadFilterQuery(
        MONEY_LEDGER_INVESTMENT,
        [{ id: second.investmentAccountId, type: "investment" }],
        [],
        now,
      );
      const input = moneyTransactionsListQueryInput(
        filterQuery,
        1,
        20,
        "occurredAt",
        "desc",
      );
      assert.equal(input.from, second.window.from);
      assert.equal(input.to, second.window.to);

      const [{ value: visibleTx }] = await db
        .select({ value: count() })
        .from(moneyTransaction)
        .innerJoin(
          moneyAccount,
          eq(moneyAccount.id, moneyTransaction.accountId),
        )
        .where(
          and(
            eq(moneyTransaction.workspaceId, second.workspaceId),
            gte(moneyTransaction.occurredAt, new Date(String(input.from))),
            lte(moneyTransaction.occurredAt, new Date(String(input.to))),
            inArray(moneyAccount.type, ["investment"]),
          ),
        );
      assert.equal(visibleTx, txCount);

      const page = await listLoansInstallments(second.workspaceId, {
        loanId: second.loanId,
        limit: 50,
      });
      assert.equal(page.items.length, 50);
      assert.ok(page.nextCursor, "page-1 must yield nextCursor for measure");

      const statusPairs = await db
        .select({
          scheduleId: loanScheduleInstallment.id,
          statusId: loanInstallmentStatus.scheduleInstallmentId,
        })
        .from(loanScheduleInstallment)
        .innerJoin(
          loanInstallmentStatus,
          eq(
            loanInstallmentStatus.scheduleInstallmentId,
            loanScheduleInstallment.id,
          ),
        )
        .where(eq(loanScheduleInstallment.loanId, second.loanId));
      assert.equal(statusPairs.length, installmentCount);

      const pendingPage = await listLoansInstallments(second.workspaceId, {
        loanId: second.loanId,
        status: "pending",
        limit: 50,
      });
      assert.ok(pendingPage.items.length > 0);

      const paidPage = await listLoansInstallments(second.workspaceId, {
        loanId: second.loanId,
        status: "paid",
        limit: 50,
      });
      assert.ok(paidPage.items.length > 0);

      await cleanupInvestmentsLoansPerfFixture({
        workspaceId: second.workspaceId,
      });
      const after = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.id, second.workspaceId));
      assert.equal(after.length, 0);

      const orphanLoan = await db
        .select({ id: loan.id })
        .from(loan)
        .where(eq(loan.id, second.loanId));
      assert.equal(orphanLoan.length, 0);

      const orphanTx = await db.execute(sql`
        select 1 from money_transaction
        where workspace_id = ${second.workspaceId}::uuid
        limit 1
      `);
      assert.equal(orphanTx.length, 0);
    },
  );
});
