import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { moneyDefaultMonthFilterQuery } from "@/lib/money-first-load-filters";
import {
  applyMoneyAnalyticsAtfSeed,
  applyMoneyBootstrapSeed,
} from "@/lib/money-ssr-seed";
import {
  moneyAnalyticsChartLookupsQueryOptions,
  moneyAnalyticsDashboardQueryOptions,
  moneyAnalyticsDistributionQueryOptions,
  moneyAnalyticsOverviewQueryOptions,
  moneyAnalyticsSummaryQueryOptions,
  moneyBootstrapQueryKey,
} from "@/lib/money-query-options";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";

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
  it("fills dashboard plus summary/overview/distribution keys", () => {
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
    const overview = {
      column: [],
      line: [],
      lineCompare: undefined,
      lineMode: "date" as const,
    };
    const distribution = {
      pieSpend: [],
      pieIncome: [],
      categoryByMonthStacked: [],
    };

    applyMoneyAnalyticsAtfSeed(qc, boot.workspaceId, filterQuery, {
      summary,
      overview,
      distribution,
    });

    assert.deepEqual(
      qc.getQueryData(
        moneyAnalyticsDashboardQueryOptions(boot.workspaceId, filterQuery)
          .queryKey,
      ),
      {
        moneyAnalyticsSummary: summary,
        moneyAnalyticsOverview: overview,
      },
    );
    assert.deepEqual(
      qc.getQueryData(
        moneyAnalyticsSummaryQueryOptions(boot.workspaceId, filterQuery)
          .queryKey,
      ),
      { moneyAnalyticsSummary: summary },
    );
    assert.deepEqual(
      qc.getQueryData(
        moneyAnalyticsOverviewQueryOptions(boot.workspaceId, filterQuery)
          .queryKey,
      ),
      { moneyAnalyticsOverview: overview },
    );
    assert.deepEqual(
      qc.getQueryData(
        moneyAnalyticsDistributionQueryOptions(boot.workspaceId, filterQuery)
          .queryKey,
      ),
      { moneyAnalyticsDistribution: distribution },
    );
  });
});
