import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investmentInstrument, investmentTradeJournal } from "@/db/schema/investment";
import { loan, loanScheduleInstallment } from "@/db/schema/loans";
import {
  moneyAccount,
  moneyBudget,
  moneyCategory,
  moneyMerchant,
  moneyRecurrentTemplate,
  moneyRule,
  moneyTag,
  moneyTransaction,
} from "@/db/schema/money";
import { workspace } from "@/db/schema/workspace";
import { resetWorkspaceData } from "@/lib/workspace-reset";
import { workspaceResetSchema } from "@/lib/validators/workspace";

describe("workspaceResetSchema", () => {
  it("validates uuid workspaceId", () => {
    const validId = "11111111-1111-4111-8111-111111111111";
    assert.deepEqual(workspaceResetSchema.parse({ workspaceId: validId }), {
      workspaceId: validId,
    });
    assert.throws(() => workspaceResetSchema.parse({ workspaceId: "invalid-uuid" }));
  });
});

describe("resetWorkspaceData integration", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  it(
    "atomically wipes all loans, investments, money records, and clears workspace currency",
    { skip: !hasDb },
    async () => {
      const workspaceId = randomUUID();
      const userSub = `test-reset-${workspaceId}`;

      await db.insert(workspace).values({
        id: workspaceId,
        name: "Test Reset Workspace",
        kind: "personal",
        ownedByUserSub: userSub,
        defaultCurrency: "USD",
      });

      const [account] = await db
        .insert(moneyAccount)
        .values({
          workspaceId,
          name: "Checking",
          type: "checking",
          currency: "USD",
        })
        .returning();

      const [category] = await db
        .insert(moneyCategory)
        .values({
          workspaceId,
          name: "Groceries",
          kind: "expense",
        })
        .returning();

      const [tag] = await db
        .insert(moneyTag)
        .values({
          workspaceId,
          name: "Essential",
        })
        .returning();

      const [merchant] = await db
        .insert(moneyMerchant)
        .values({
          workspaceId,
          name: "Supermarket",
        })
        .returning();

      await db.insert(moneyBudget).values({
        workspaceId,
        scopeType: "workspace",
        limitAmountMinor: 50_000,
      });

      await db.insert(moneyRule).values({
        workspaceId,
        name: "Auto tag",
        kind: "expense",
        match: { contains: "market" },
        action: { setTagIds: [tag.id] },
      });

      await db.insert(moneyRecurrentTemplate).values({
        workspaceId,
        name: "Monthly sub",
        cadence: "monthly",
        nextRunAt: new Date(),
        template: {
          amountMinor: 1_000,
          kind: "expense",
          accountId: account.id,
        },
      });

      await db.insert(moneyTransaction).values({
        workspaceId,
        accountId: account.id,
        categoryId: category.id,
        merchantId: merchant.id,
        amountMinor: 2_500,
        kind: "expense",
        occurredAt: new Date(),
        createdBySub: userSub,
      });

      const [instrument] = await db
        .insert(investmentInstrument)
        .values({
          workspaceId,
          name: "Apple Inc.",
          symbol: "AAPL",
          kind: "stocks",
          currency: "USD",
        })
        .returning();

      await db.insert(investmentTradeJournal).values({
        workspaceId,
        instrumentId: instrument.id,
        moneyAccountId: account.id,
        activityType: "buy",
        quantity: "10",
        openPrice: "150.00",
        activityDate: "2026-03-01",
        createdBySub: userSub,
      });

      const [createdLoan] = await db
        .insert(loan)
        .values({
          workspaceId,
          name: "Car Loan",
          currency: "USD",
          principalMinor: 1_000_000,
          annualRateBps: 500,
          termMonths: 12,
          startDate: "2026-01-01",
          dueDayOfMonth: 15,
          paymentMinor: 85_000,
          calculationMethod: "nominal_monthly",
          moneyAccountId: account.id,
          moneyCategoryId: category.id,
        })
        .returning();

      await db.insert(loanScheduleInstallment).values({
        loanId: createdLoan.id,
        installmentNumber: 1,
        dueDate: "2026-02-15",
        paymentMinor: 85_000,
        principalMinor: 80_000,
        interestMinor: 5_000,
        balanceAfterMinor: 920_000,
      });

      // Execute comprehensive reset
      await resetWorkspaceData(workspaceId);

      // Verify all tables are cleared for this workspace
      const loans = await db.select().from(loan).where(eq(loan.workspaceId, workspaceId));
      assert.equal(loans.length, 0);

      const trades = await db
        .select()
        .from(investmentTradeJournal)
        .where(eq(investmentTradeJournal.workspaceId, workspaceId));
      assert.equal(trades.length, 0);

      const instruments = await db
        .select()
        .from(investmentInstrument)
        .where(eq(investmentInstrument.workspaceId, workspaceId));
      assert.equal(instruments.length, 0);

      const transactions = await db
        .select()
        .from(moneyTransaction)
        .where(eq(moneyTransaction.workspaceId, workspaceId));
      assert.equal(transactions.length, 0);

      const budgets = await db
        .select()
        .from(moneyBudget)
        .where(eq(moneyBudget.workspaceId, workspaceId));
      assert.equal(budgets.length, 0);

      const rules = await db
        .select()
        .from(moneyRule)
        .where(eq(moneyRule.workspaceId, workspaceId));
      assert.equal(rules.length, 0);

      const recurrentTemplates = await db
        .select()
        .from(moneyRecurrentTemplate)
        .where(eq(moneyRecurrentTemplate.workspaceId, workspaceId));
      assert.equal(recurrentTemplates.length, 0);

      const merchants = await db
        .select()
        .from(moneyMerchant)
        .where(eq(moneyMerchant.workspaceId, workspaceId));
      assert.equal(merchants.length, 0);

      const tags = await db.select().from(moneyTag).where(eq(moneyTag.workspaceId, workspaceId));
      assert.equal(tags.length, 0);

      const categories = await db
        .select()
        .from(moneyCategory)
        .where(eq(moneyCategory.workspaceId, workspaceId));
      assert.equal(categories.length, 0);

      const accounts = await db
        .select()
        .from(moneyAccount)
        .where(eq(moneyAccount.workspaceId, workspaceId));
      assert.equal(accounts.length, 0);

      // Workspace still exists, but defaultCurrency is cleared
      const [updatedWs] = await db
        .select()
        .from(workspace)
        .where(eq(workspace.id, workspaceId));
      assert.ok(updatedWs);
      assert.equal(updatedWs.defaultCurrency, null);
    },
  );
});
