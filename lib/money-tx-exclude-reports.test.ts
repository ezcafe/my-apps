import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccount, moneyBudget, moneyTransaction } from "@/db/schema/money";
import { workspace as workspaceTable } from "@/db/schema/workspace";
import { computeMoneyAnalyticsSummary } from "@/lib/money-services/analytics";
import { listMoneyBudgets } from "@/lib/money-services/budgets";
import {
  createMoneyTransaction,
  getMoneyTransaction,
  updateMoneyTransaction,
} from "@/lib/money-services/transactions";
import {
  moneyTransactionConditionsForAnalytics,
  moneyTransactionConditionsForReports,
} from "@/lib/money-transaction-analytics-conditions";
import {
  transactionCreateSchema,
  transactionUpdateSchema,
} from "@/lib/validators/money";

describe("excludeFromAnalyticsAndBudget validators", () => {
  it("accepts the flag on create and update", () => {
    const base = {
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      amountMinor: 100,
    };
    assert.equal(
      transactionCreateSchema.parse({
        ...base,
        excludeFromAnalyticsAndBudget: true,
      }).excludeFromAnalyticsAndBudget,
      true,
    );
    assert.equal(
      transactionCreateSchema.parse(base).excludeFromAnalyticsAndBudget,
      false,
    );
    assert.equal(
      transactionUpdateSchema.parse({
        excludeFromAnalyticsAndBudget: false,
      }).excludeFromAnalyticsAndBudget,
      false,
    );
  });
});

describe("moneyTransactionConditionsForReports", () => {
  it("adds one more condition than analytics-only filters", () => {
    const filters = { from: "2026-01-01T00:00:00.000Z", to: "2026-06-01T00:00:00.000Z" };
    const wsId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const analyticsOnly = moneyTransactionConditionsForAnalytics(wsId, filters);
    const forReports = moneyTransactionConditionsForReports(wsId, filters);
    assert.equal(forReports.length, analyticsOnly.length + 1);
  });
});

describe("excludeFromAnalyticsAndBudget integration", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  async function seedWorkspace() {
    const workspaceId = randomUUID();
    const userSub = `test-exclude-${workspaceId}`;
    await db.insert(workspaceTable).values({
      id: workspaceId,
      name: "Exclude reports test",
      kind: "personal",
      ownedByUserSub: userSub,
      defaultCurrency: "USD",
    });
    const ctx = { workspaceId, userSub };
    const [account] = await db
      .insert(moneyAccount)
      .values({
        workspaceId,
        name: "Checking",
        type: "checking",
        currency: "USD",
      })
      .returning();
    return { ctx, accountId: account.id };
  }

  it(
    "omits excluded expenses from analytics summary and workspace budget spend",
    { skip: !hasDb },
    async () => {
      const { ctx, accountId } = await seedWorkspace();
      const occurredAt = new Date("2026-03-15T12:00:00.000Z").toISOString();
      const filters = {
        from: "2026-03-01T00:00:00.000Z",
        to: "2026-03-31T23:59:59.999Z",
      };

      await createMoneyTransaction(ctx, {
        accountId,
        kind: "expense",
        amountMinor: 1_000,
        occurredAt,
        excludeFromAnalyticsAndBudget: false,
      });
      await createMoneyTransaction(ctx, {
        accountId,
        kind: "expense",
        amountMinor: 2_500,
        occurredAt,
        excludeFromAnalyticsAndBudget: true,
      });

      const summary = await computeMoneyAnalyticsSummary(ctx.workspaceId, filters);
      assert.equal(summary.stats.expenseMinor, 1_000);
      assert.equal(summary.stats.transactionCount, 1);

      await db.insert(moneyBudget).values({
        workspaceId: ctx.workspaceId,
        scopeType: "workspace",
        scopeId: null,
        limitAmountMinor: 10_000,
      });

      const budgets = (await listMoneyBudgets(ctx.workspaceId, {
        includeSpent: true,
        from: filters.from,
        to: filters.to,
      })) as Array<{ scopeType: string; spentAmountMinor: number }>;
      const workspaceBudget = budgets.find((b) => b.scopeType === "workspace");
      assert.equal(workspaceBudget?.spentAmountMinor, 1_000);
    },
  );

  it(
    "syncs exclude flag to the paired transfer leg on update",
    { skip: !hasDb },
    async () => {
      const { ctx, accountId } = await seedWorkspace();
      const [toAccount] = await db
        .insert(moneyAccount)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Savings",
          type: "savings",
          currency: "USD",
        })
        .returning();

      const fromLeg = await createMoneyTransaction(ctx, {
        accountId,
        toAccountId: toAccount.id,
        kind: "transfer",
        amountMinor: 5_000,
        occurredAt: new Date("2026-04-01T12:00:00.000Z").toISOString(),
      });

      const pairId = fromLeg.transferPairId;
      assert.ok(pairId);

      const legs = await db
        .select({
          id: moneyTransaction.id,
          excludeFromAnalyticsAndBudget:
            moneyTransaction.excludeFromAnalyticsAndBudget,
        })
        .from(moneyTransaction)
        .where(
          and(
            eq(moneyTransaction.workspaceId, ctx.workspaceId),
            eq(moneyTransaction.transferPairId, pairId),
          ),
        );
      assert.equal(legs.length, 2);
      assert.ok(legs.every((l) => l.excludeFromAnalyticsAndBudget === false));

      await updateMoneyTransaction(ctx, fromLeg.id, {
        excludeFromAnalyticsAndBudget: true,
      });

      const legsAfter = await db
        .select({
          excludeFromAnalyticsAndBudget:
            moneyTransaction.excludeFromAnalyticsAndBudget,
        })
        .from(moneyTransaction)
        .where(
          and(
            eq(moneyTransaction.workspaceId, ctx.workspaceId),
            eq(moneyTransaction.transferPairId, pairId),
          ),
        );
      assert.ok(legsAfter.every((l) => l.excludeFromAnalyticsAndBudget === true));

      const reloaded = await getMoneyTransaction(ctx.workspaceId, fromLeg.id);
      assert.equal(reloaded?.excludeFromAnalyticsAndBudget, true);
    },
  );
});
