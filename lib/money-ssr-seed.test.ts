import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { moneyDefaultMonthFilterQuery } from "@/lib/money-first-load-filters";
import {
  applyMoneyAnalyticsAtfSeed,
  applyMoneyBootstrapSeed,
  dehydrateLoansInsightsPageState,
  dehydrateMoneyAnalyticsPageState,
  dehydrateMoneyInvestmentsPageState,
  dehydrateMoneyLayoutState,
} from "@/lib/money-ssr-seed";
import {
  moneyAnalyticsAtfQueryOptions,
  moneyAnalyticsChartLookupsQueryOptions,
  moneyAnalyticsDashboardQueryOptions,
  moneyAnalyticsDistributionQueryOptions,
  moneyAnalyticsOverviewQueryOptions,
  moneyAnalyticsSummaryQueryOptions,
  moneyBootstrapQueryKey,
} from "@/lib/money-query-options";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";
import { investmentKeys } from "@/lib/investment-query-options";
import { loansKeys } from "@/lib/loans-query-options";

const FIXED = new Date(2026, 7, 1);

const boot = {
  workspaceId: "11111111-1111-4111-8111-111111111111",
  defaultCurrency: "USD",
  needsCurrencySetup: false,
  defaultWorkspaceId: "11111111-1111-4111-8111-111111111111",
  workspaces: [],
  accounts: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Checking",
      currency: "USD",
      type: "checking",
      balanceMinor: 0,
    },
  ],
  categories: [],
  tags: [],
} as unknown as MoneyWorkspaceBootstrapData;

describe("applyMoneyBootstrapSeed", () => {
  it("writes bootstrap and chart-lookup keys the client reads", () => {
    const qc = new QueryClient();
    applyMoneyBootstrapSeed(qc, boot);
    assert.deepEqual(qc.getQueryData(moneyBootstrapQueryKey), boot);
    assert.deepEqual(
      qc.getQueryData(
        moneyAnalyticsChartLookupsQueryOptions(boot.workspaceId).queryKey,
      ),
      {
        moneyAccounts: boot.accounts,
        moneyCategories: boot.categories,
        moneyTags: boot.tags,
      },
    );
  });
});

describe("applyMoneyAnalyticsAtfSeed", () => {
  it("fills ATF plus summary keys and skips overview/distribution", () => {
    const qc = new QueryClient();
    const filterQuery = moneyDefaultMonthFilterQuery(FIXED);
    const summary = {
      stats: {
        expenseMinor: 1,
        incomeMinor: 2,
        netMinor: 1,
        transactionCount: 1,
        savingsRatePct: 50,
      },
      range: { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z" },
    };
    const pieSpend = [
      { categoryId: "food", label: "Food", valueMinor: 100 },
    ];

    applyMoneyAnalyticsAtfSeed(qc, boot.workspaceId, filterQuery, {
      summary,
      pieSpend,
    });

    assert.deepEqual(
      qc.getQueryData(
        moneyAnalyticsAtfQueryOptions(boot.workspaceId, filterQuery).queryKey,
      ),
      { moneyAnalyticsAtf: { summary, pieSpend } },
    );
    assert.deepEqual(
      qc.getQueryData(
        moneyAnalyticsSummaryQueryOptions(boot.workspaceId, filterQuery)
          .queryKey,
      ),
      { moneyAnalyticsSummary: summary },
    );
    assert.equal(
      qc.getQueryData(
        moneyAnalyticsDashboardQueryOptions(boot.workspaceId, filterQuery)
          .queryKey,
      ),
      undefined,
    );
    assert.equal(
      qc.getQueryData(
        moneyAnalyticsOverviewQueryOptions(boot.workspaceId, filterQuery)
          .queryKey,
      ),
      undefined,
    );
    assert.equal(
      qc.getQueryData(
        moneyAnalyticsDistributionQueryOptions(boot.workspaceId, filterQuery)
          .queryKey,
      ),
      undefined,
    );
  });
});

describe("money dehydrate splits", () => {
  it("layout dehydrate keeps bootstrap + lookups and drops ATF", () => {
    const qc = new QueryClient();
    const filterQuery = moneyDefaultMonthFilterQuery(FIXED);
    applyMoneyBootstrapSeed(qc, boot);
    applyMoneyAnalyticsAtfSeed(qc, boot.workspaceId, filterQuery, {
      summary: {
        stats: {
          expenseMinor: 1,
          incomeMinor: 2,
          netMinor: 1,
          transactionCount: 1,
          savingsRatePct: 50,
        },
        range: { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z" },
      },
      pieSpend: [{ categoryId: "food", label: "Food", valueMinor: 100 }],
    });

    const state = dehydrateMoneyLayoutState(qc);
    const slots = new Set(
      state.queries.map((query) => String(query.queryKey[1])),
    );
    assert.equal(slots.has("bootstrap"), true);
    assert.equal(slots.has("analyticsChartLookups"), true);
    assert.equal(slots.has("analyticsAtf"), false);
    assert.equal(slots.has("analyticsSummary"), false);
  });

  it("analytics page dehydrate keeps ATF only", () => {
    const qc = new QueryClient();
    const filterQuery = moneyDefaultMonthFilterQuery(FIXED);
    applyMoneyBootstrapSeed(qc, boot);
    applyMoneyAnalyticsAtfSeed(qc, boot.workspaceId, filterQuery, {
      summary: {
        stats: {
          expenseMinor: 1,
          incomeMinor: 2,
          netMinor: 1,
          transactionCount: 1,
          savingsRatePct: 50,
        },
        range: { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z" },
      },
      pieSpend: [{ categoryId: "food", label: "Food", valueMinor: 100 }],
    });

    const state = dehydrateMoneyAnalyticsPageState(qc);
    const slots = new Set(
      state.queries.map((query) => String(query.queryKey[1])),
    );
    assert.equal(slots.has("analyticsAtf"), true);
    assert.equal(slots.has("bootstrap"), false);
    assert.equal(slots.has("analyticsChartLookups"), false);
    assert.equal(slots.has("analyticsSummary"), false);
  });

  it("investments page dehydrate keeps insights ATF and drops bootstrap", () => {
    const qc = new QueryClient();
    applyMoneyBootstrapSeed(qc, boot);
    qc.setQueryData(investmentKeys.bootstrap(), {
      workspaceId: boot.workspaceId,
      defaultCurrency: "USD",
      needsCurrencySetup: false,
      defaultWorkspaceId: boot.workspaceId,
      instrumentCount: 0,
      workspaces: [],
    });
    qc.setQueryData(investmentKeys.insightsAtf("2026-01-01", "2026-08-01"), {
      range: { from: "2026-01-01", to: "2026-08-01" },
      summary: {
        resultsMinor: 0,
        openNotionalMinor: 0,
        realizedPnlMinor: 0,
        openLotsCount: 0,
      },
      series: [],
      allocation: [],
    });

    const state = dehydrateMoneyInvestmentsPageState(qc);
    const slots = new Set(
      state.queries.map((query) => String(query.queryKey[1])),
    );
    assert.equal(slots.has("insightsAtf"), true);
    assert.equal(slots.has("holdings"), false);
    assert.equal(slots.has("openActivities"), false);
    assert.equal(slots.has("bootstrap"), false);
  });

  it("loans insights dehydrate keeps ranged ATF and drops bootstrap", () => {
    const qc = new QueryClient();
    applyMoneyBootstrapSeed(qc, boot);
    qc.setQueryData(loansKeys.bootstrap(), {
      workspaceId: boot.workspaceId,
      defaultCurrency: "USD",
      needsCurrencySetup: false,
      defaultWorkspaceId: boot.workspaceId,
      dueCount: 0,
      workspaces: [],
    });
    qc.setQueryData(loansKeys.insightsAtf("2026-08-01", "2026-08-31"), {
      range: { from: "2026-08-01", to: "2026-08-31" },
      summary: {
        remainingMinor: 0,
        monthlyObligationMinor: 0,
        weightedAprBps: null,
        nextDueDate: null,
        loanCount: 0,
      },
      remainingByLoan: [],
      paidPrincipalMinor: 0,
      paidInterestMinor: 0,
    });

    const state = dehydrateLoansInsightsPageState(qc);
    const slots = new Set(
      state.queries.map((query) => String(query.queryKey[1])),
    );
    assert.equal(slots.has("insightsAtf"), true);
    assert.equal(slots.has("bootstrap"), false);
  });
});
