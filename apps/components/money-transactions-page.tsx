"use client";

import { presentClientError, queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
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
import {
  defaultAnalyticsFilters,
  type AnalyticsFiltersValue,
  type AnalyticsLookupAccount,
  type AnalyticsLookupMerchant,
  type AnalyticsLookupRecurrence,
  type AnalyticsLookupTag,
  type AnalyticsWorkspaceRow,
} from "@/components/analytics-filters";
import { MoneyAnalyticsFiltersBarSkeleton, MoneyAnalyticsTransactionsTableSkeleton } from "@/components/money-analytics-skeleton";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { buildQuery } from "@/lib/analytics-build-query";
import { analyticsFiltersEqual } from "@/lib/analytics-graphql-filters";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_SET_ACTIVE_WORKSPACE_MUTATION } from "@/lib/money-gql-documents";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import {
  moneyAnalyticsChartLookupsQueryOptions,
  moneyAnalyticsMerchantLookupsQueryOptions,
  moneyAnalyticsRecurrenceLookupsQueryOptions,
  moneyWorkspaceStateQueryOptions,
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
  { loading: () => <MoneyAnalyticsTransactionsTableSkeleton /> },
);

export function MoneyTransactionsPage({
  userSub,
  authenticated,
}: {
  userSub?: string;
  authenticated: boolean;
}) {
  const {
    workspaceId: coreWorkspaceId,
    defaultCurrency,
    refreshWorkspaceCurrency,
    workspaceReady,
  } = useWorkspaceCurrency();
  const canRunMoneyQueries = authenticated && typeof window !== "undefined";

  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [applied, setApplied] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [isFilterPending, startFilterTransition] = useTransition();

  const workspaceStateQuery = useQuery({
    ...moneyWorkspaceStateQueryOptions(),
    enabled: canRunMoneyQueries,
  });

  const workspaces = useMemo(
    () =>
      (workspaceStateQuery.data?.workspaces ?? []) as AnalyticsWorkspaceRow[],
    [workspaceStateQuery.data?.workspaces],
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
      Boolean(activeWorkspaceId),
  });
  const recurrenceLookupsQuery = useQuery({
    ...moneyAnalyticsRecurrenceLookupsQueryOptions(activeWorkspaceId),
    enabled:
      canRunMoneyQueries &&
      workspaceReady &&
      !workspaceSyncPending &&
      Boolean(activeWorkspaceId),
  });

  const accounts = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (chartLookupsQuery.data?.moneyAccounts ?? [])) as AnalyticsLookupAccount[],
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

  const dirty = !analyticsFiltersEqual(draft, applied);
  const filterQuery = useMemo(() => buildQuery(applied), [applied]);

  const autoSyncedWorkspaceRef = useRef<string | null>(null);

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
    const fresh = defaultAnalyticsFilters();
    setDraft(fresh);
    setApplied(fresh);
  }, []);

  const loadError =
    error ??
    (queryErrorMessage(workspaceStateQuery.error)) ??
    (queryErrorMessage(chartLookupsQuery.error)) ??
    (queryErrorMessage(merchantLookupsQuery.error)) ??
    (queryErrorMessage(recurrenceLookupsQuery.error));

  if (!workspaceReady && !workspaceStateQuery.data && !workspaceStateQuery.error) {
    return (
      <>
        <MoneyAnalyticsFiltersBarSkeleton />
        <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3">
          <div className="col-span-2 md:col-span-6 lg:col-span-12">
            <MoneyAnalyticsTransactionsTableSkeleton />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AnalyticsFiltersBar
        title="Transactions"
        description="Browse and edit workspace transactions. Default range is the current calendar month — apply to refresh."
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
      />

      {loadError ? (
        <Alert
          variant="error"
          title="Couldn’t load transactions"
          description={loadError}
          className="mb-3"
        />
      ) : null}

      <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3">
        {lookupsReady && activeWorkspaceId ? (
          <AnalyticsTransactionsTableLazy
            filterQuery={filterQuery}
            activeWorkspaceId={activeWorkspaceId}
            accounts={accounts}
            categories={categories}
            tags={tags}
            currency={defaultCurrency}
            deferFetchUntilVisible={false}
            variant="standalone"
          />
        ) : (
          <div className="col-span-2 md:col-span-6 lg:col-span-12">
            <MoneyAnalyticsTransactionsTableSkeleton />
          </div>
        )}
      </div>
    </>
  );
}
