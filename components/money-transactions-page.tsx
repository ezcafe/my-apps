"use client";

import { presentClientError, queryErrorMessage } from "@/lib/user-facing-error";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  defaultAnalyticsFilters,
  type AnalyticsFiltersValue,
  type AnalyticsFilterViewConfig,
  type AnalyticsLookupMerchant,
  type AnalyticsLookupRecurrence,
  type AnalyticsLookupTag,
  type AnalyticsWorkspaceRow,
} from "@/components/analytics-filters";
import { MoneyAnalyticsFiltersBarSkeleton, AnalyticsStatsSkeleton, MoneyAnalyticsTransactionsTableSkeleton, AnalyticsPeriodChipSkeleton } from "@/components/money-analytics-skeleton";
import { AnalyticsPeriodChip } from "@/components/analytics-period-chip";
import { resolveActiveFilterLabels } from "@/lib/money-active-filter-summary";
import { useSetAppHeader } from "@/components/app-header-override";
import { MoneyLedgerSummaryStats } from "@/components/money-ledger-summary-stats";
import { MoneyLedgerTrendCard } from "@/components/money-ledger-trend-card";
import { MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK } from "@/lib/money-layout";
import { cn } from "@/lib/cn";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { buildQuery } from "@/lib/analytics-build-query";
import {
  defaultFiltersForLedgerPreset,
  mergeLedgerPresetQuery,
  moneyLedgerStatCardOrder,
  resolveLedgerPresetCategoryIds,
} from "@/lib/money-ledger-presets";
import { analyticsFiltersEqual } from "@/lib/analytics-graphql-filters";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_SET_ACTIVE_WORKSPACE_MUTATION } from "@/lib/money-gql-documents";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import {
  moneyAnalyticsChartLookupsQueryOptions,
  moneyAnalyticsMerchantLookupsQueryOptions,
  moneyAnalyticsRecurrenceLookupsQueryOptions,
  moneyBootstrapQueryOptions,
  type MoneyAccountLookup,
} from "@/lib/money-query-options";

const AnalyticsFiltersBar = dynamic(
  () =>
    import("@/components/analytics-filters").then((m) => ({
      default: m.AnalyticsFiltersBar,
    })),
  { ssr: false },
);

const AnalyticsTransactionsTableLazy = dynamic(
  () =>
    import("@/components/analytics-transactions-table").then((m) => ({
      default: m.AnalyticsTransactionsTable,
    })),
  { loading: () => <MoneyAnalyticsTransactionsTableSkeleton selectable /> },
);

export function MoneyTransactionsPage({
  userSub,
  authenticated,
  preset,
  viewNav,
  variant = "page",
  showSummaryStats = false,
}: {
  userSub?: string;
  authenticated: boolean;
  preset?: import("@/lib/money-ledger-presets").MoneyLedgerPreset;
  /** Route-based View filter (Activity / Portfolio, etc.). */
  viewNav?: {
    menuLabel?: string;
    value: string;
    defaultValue?: string;
    options: ReadonlyArray<{ id: string; label: string; href: string }>;
  };
  /**
   * `page` — full ledger chrome (optional View nav, trend chart).
   * `section` — embed under another surface (no View nav / trend).
   */
  variant?: "page" | "section";
  /** Income / Expenses / Net / Savings rate strip (Analytics-style). */
  showSummaryStats?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSection = variant === "section";
  const showStats = !isSection && showSummaryStats;
  const statCardOrder = useMemo(
    () => moneyLedgerStatCardOrder(preset),
    [preset],
  );

  useSetAppHeader(
    preset && !isSection
      ? { meta: preset.description }
      : null,
  );

  const {
    workspaceId: coreWorkspaceId,
    defaultCurrency,
    refreshWorkspaceCurrency,
    workspaceReady,
  } = useWorkspaceCurrency();
  const canRunMoneyQueries = authenticated;

  const viewFilter = useMemo((): AnalyticsFilterViewConfig | undefined => {
    if (isSection || !viewNav) return undefined;
    return {
      menuLabel: viewNav.menuLabel ?? "View",
      value: viewNav.value,
      defaultValue: viewNav.defaultValue ?? viewNav.options[0]?.id,
      options: viewNav.options.map(({ id, label }) => ({ id, label })),
      onChange: (id) => {
        const href = viewNav.options.find((o) => o.id === id)?.href;
        if (href) router.push(href);
      },
    };
  }, [isSection, router, viewNav]);

  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(
    null,
  );
  const [advancedFilterLookups, setAdvancedFilterLookups] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [applied, setApplied] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [isFilterPending, startFilterTransition] = useTransition();

  const bootstrapQuery = useQuery({
    ...moneyBootstrapQueryOptions(),
    enabled: canRunMoneyQueries,
  });

  const workspaces = useMemo(
    () =>
      (bootstrapQuery.data?.workspaces ?? []) as AnalyticsWorkspaceRow[],
    [bootstrapQuery.data?.workspaces],
  );
  const resolvedWorkspaceId = useMemo(() => {
    let resolvedId = coreWorkspaceId ?? "";
    if (!workspaces.some((workspace) => workspace.id === resolvedId)) {
      resolvedId =
        workspaces.find((workspace) => workspace.isDefault)?.id ??
        workspaces[0]?.id ??
        resolvedId;
    }
    return resolvedId;
  }, [coreWorkspaceId, workspaces]);
  const activeWorkspaceId = pendingWorkspaceId ?? resolvedWorkspaceId;
  const workspaceSyncPending =
    pendingWorkspaceId != null ||
    (resolvedWorkspaceId !== "" &&
      resolvedWorkspaceId !== (coreWorkspaceId ?? ""));

  const chartLookupsQuery = useQuery({
    ...moneyAnalyticsChartLookupsQueryOptions(activeWorkspaceId),
    enabled:
      canRunMoneyQueries &&
      workspaceReady &&
      !workspaceSyncPending &&
      Boolean(activeWorkspaceId),
  });
  const merchantLookupsQuery = useQuery({
    ...moneyAnalyticsMerchantLookupsQueryOptions(activeWorkspaceId),
    enabled:
      canRunMoneyQueries &&
      workspaceReady &&
      !workspaceSyncPending &&
      Boolean(activeWorkspaceId) &&
      advancedFilterLookups,
  });
  const recurrenceLookupsQuery = useQuery({
    ...moneyAnalyticsRecurrenceLookupsQueryOptions(activeWorkspaceId),
    enabled:
      canRunMoneyQueries &&
      workspaceReady &&
      !workspaceSyncPending &&
      Boolean(activeWorkspaceId) &&
      advancedFilterLookups,
  });

  const accounts = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (chartLookupsQuery.data?.moneyAccounts ?? [])) as MoneyAccountLookup[],
    [workspaceSyncPending, chartLookupsQuery.data?.moneyAccounts],
  );
  const categories = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (chartLookupsQuery.data?.moneyCategories ?? [])) as MoneyCategoryRow[],
    [workspaceSyncPending, chartLookupsQuery.data?.moneyCategories],
  );
  const tags = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (chartLookupsQuery.data?.moneyTags ?? [])) as AnalyticsLookupTag[],
    [workspaceSyncPending, chartLookupsQuery.data?.moneyTags],
  );
  const merchants = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (merchantLookupsQuery.data?.moneyMerchants ?? [])) as AnalyticsLookupMerchant[],
    [workspaceSyncPending, merchantLookupsQuery.data?.moneyMerchants],
  );
  const recurrenceTemplates = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (recurrenceLookupsQuery.data?.moneyRecurrenceTemplates ?? [])) as AnalyticsLookupRecurrence[],
    [workspaceSyncPending, recurrenceLookupsQuery.data?.moneyRecurrenceTemplates],
  );
  const lookupsReady = !workspaceSyncPending && chartLookupsQuery.isSuccess;

  const presetCategoryIds = useMemo(
    () => (preset ? resolveLedgerPresetCategoryIds(preset, categories) : []),
    [preset, categories],
  );

  const activeFilters = useMemo(
    () =>
      resolveActiveFilterLabels(applied, {
        accounts,
        categories,
        merchants,
        tags,
        recurrenceTemplates,
        viewScopeLabel:
          viewNav && viewNav.value !== (viewNav.defaultValue ?? viewNav.options[0]?.id)
            ? viewNav.options.find((o) => o.id === viewNav.value)?.label
            : undefined,
      }),
    [
      applied,
      accounts,
      categories,
      merchants,
      tags,
      recurrenceTemplates,
      viewNav,
    ],
  );

  const pageDefaultFilters = useCallback(() => {
    const base = defaultFiltersForLedgerPreset(preset, accounts, categories);
    const paramFrom = searchParams.get("from");
    const paramTo = searchParams.get("to");
    if (paramFrom && /^\d{4}-\d{2}-\d{2}$/.test(paramFrom)) {
      base.fromDate = paramFrom;
    }
    if (paramTo && /^\d{4}-\d{2}-\d{2}$/.test(paramTo)) {
      base.toDate = paramTo;
    }
    return base;
  }, [preset, accounts, categories, searchParams]);

  const dirty = !analyticsFiltersEqual(draft, applied);
  const filterQuery = useMemo(
    () =>
      preset
        ? mergeLedgerPresetQuery(
            buildQuery(applied),
            preset,
            presetCategoryIds.length > 0 ? presetCategoryIds : undefined,
          )
        : buildQuery(applied),
    [applied, preset, presetCategoryIds],
  );

  const autoSyncedWorkspaceRef = useRef<string | null>(null);
  const seededFiltersKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lookupsReady || !preset) return;
    const key = `${activeWorkspaceId}:${preset.title}`;
    if (seededFiltersKeyRef.current === key) return;
    seededFiltersKeyRef.current = key;
    const next = pageDefaultFilters();
    setDraft(next);
    setApplied(next);
  }, [activeWorkspaceId, lookupsReady, pageDefaultFilters, preset]);

  useEffect(() => {
    if (!resolvedWorkspaceId || resolvedWorkspaceId === (coreWorkspaceId ?? "")) {
      autoSyncedWorkspaceRef.current = null;
      return;
    }
    if (!workspaces.some((workspace) => workspace.id === resolvedWorkspaceId)) {
      return;
    }

    const syncKey = `${coreWorkspaceId ?? ""}:${resolvedWorkspaceId}`;
    if (autoSyncedWorkspaceRef.current === syncKey) return;
    autoSyncedWorkspaceRef.current = syncKey;

    let cancelled = false;
    void (async () => {
      try {
        await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
          workspaceId: resolvedWorkspaceId,
        });
        if (cancelled) return;
        setError(null);
        await refreshWorkspaceCurrency();
      } catch (e: unknown) {
        if (cancelled) return;
        autoSyncedWorkspaceRef.current = null;
        setError(presentClientError("money-transactions-page", e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coreWorkspaceId, refreshWorkspaceCurrency, resolvedWorkspaceId, workspaces]);

  const handleWorkspaceChange = useCallback(
    async (next: string) => {
      if (!next || next === activeWorkspaceId) return;
      setPendingWorkspaceId(next);
      setError(null);
      try {
        await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
          workspaceId: next,
        });
        await refreshWorkspaceCurrency();
        seededFiltersKeyRef.current = null;
        const fresh = defaultAnalyticsFilters();
        setDraft(fresh);
        setApplied(fresh);
      } catch (e: unknown) {
        setError(presentClientError("money-transactions-page", e));
      } finally {
        setPendingWorkspaceId(null);
      }
    },
    [activeWorkspaceId, refreshWorkspaceCurrency],
  );

  const handleApply = useCallback(() => {
    startFilterTransition(() => {
      setApplied(draft);
    });
  }, [draft]);

  const handleReset = useCallback(() => {
    const fresh = pageDefaultFilters();
    setDraft(fresh);
    setApplied(fresh);
  }, [pageDefaultFilters]);

  const loadError =
    error ??
    (queryErrorMessage(bootstrapQuery.error)) ??
    (queryErrorMessage(chartLookupsQuery.error)) ??
    (queryErrorMessage(merchantLookupsQuery.error)) ??
    (queryErrorMessage(recurrenceLookupsQuery.error));

  if (!workspaceReady && !bootstrapQuery.data && !bootstrapQuery.error) {
    return (
      <div
        className={cn(
          !isSection && MONEY_FULL_SPAN,
          MONEY_DASHBOARD_STACK,
        )}
      >
        <MoneyAnalyticsFiltersBarSkeleton />
        <AnalyticsPeriodChipSkeleton />
        {showStats ? <AnalyticsStatsSkeleton showPeriodLine={false} /> : null}
        <MoneyAnalyticsTransactionsTableSkeleton selectable />
      </div>
    );
  }

  return (
    <div
      className={cn(
        !isSection && MONEY_FULL_SPAN,
        MONEY_DASHBOARD_STACK,
      )}
    >
      <AnalyticsFiltersBar
        viewFilter={viewFilter}
        value={draft}
        onChange={setDraft}
        onApply={handleApply}
        onReset={handleReset}
        applying={isFilterPending}
        dirty={dirty}
        accounts={accounts}
        categories={categories}
        merchants={merchants}
        tags={tags}
        recurrenceTemplates={recurrenceTemplates}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        switchingWorkspace={workspaceSyncPending}
        userSub={userSub}
        onAdvancedFiltersNeeded={() => setAdvancedFilterLookups(true)}
      />

      <AnalyticsPeriodChip
        fromDate={applied.fromDate}
        toDate={applied.toDate}
        activeFilters={activeFilters}
        dirty={dirty}
      />

      {loadError ? (
        <Alert
          variant="error"
          title="Couldn’t load transactions"
          description={loadError}
        />
      ) : null}

      {preset?.lockedCategorySeed &&
      lookupsReady &&
      presetCategoryIds.length === 0 ? (
        <Alert
          variant="warning"
          title="Bills category missing"
          description={
            <>
              Add a <span className="font-medium text-foreground">Bills</span>{" "}
              category under{" "}
              <span className="font-medium text-foreground">Necessities</span>{" "}
              in{" "}
              <a href="/money/settings/categories" className="text-accent underline-offset-2 hover:underline">
                Settings → Categories
              </a>{" "}
              to track bills here.
            </>
          }
        />
      ) : null}

      {showStats && lookupsReady && activeWorkspaceId ? (
        <section aria-label="Summary metrics">
          <MoneyLedgerSummaryStats
            filterQuery={filterQuery}
            workspaceId={activeWorkspaceId}
            currency={defaultCurrency}
            enabled={!isFilterPending}
            cardOrder={statCardOrder}
          />
        </section>
      ) : showStats ? (
        <AnalyticsStatsSkeleton showPeriodLine={false} />
      ) : null}

      {!isSection && preset?.chart && lookupsReady && activeWorkspaceId ? (
        <section aria-label="Trend chart">
          <MoneyLedgerTrendCard
            preset={preset}
            filterQuery={filterQuery}
            workspaceId={activeWorkspaceId}
            defaultCurrency={defaultCurrency}
            enabled={!isFilterPending}
          />
        </section>
      ) : null}

      {lookupsReady && activeWorkspaceId ? (
        <AnalyticsTransactionsTableLazy
          filterQuery={filterQuery}
          activeWorkspaceId={activeWorkspaceId}
          accounts={accounts}
          categories={categories}
          tags={tags}
          currency={defaultCurrency}
          deferFetchUntilVisible={isSection}
          variant="standalone"
          emptyState={preset?.emptyState}
        />
      ) : (
        <MoneyAnalyticsTransactionsTableSkeleton selectable />
      )}
    </div>
  );
}
