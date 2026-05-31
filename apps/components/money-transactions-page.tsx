"use client";

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
import { MoneyAnalyticsTransactionsTableSkeleton } from "@/components/money-analytics-skeleton";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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

const AnalyticsFilters = dynamic(
  () =>
    import("@/components/analytics-filters").then((m) => ({
      default: m.AnalyticsFilters,
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      filtersOpen &&
      workspaceReady &&
      !workspaceSyncPending &&
      Boolean(activeWorkspaceId),
  });
  const recurrenceLookupsQuery = useQuery({
    ...moneyAnalyticsRecurrenceLookupsQueryOptions(activeWorkspaceId),
    enabled:
      canRunMoneyQueries &&
      filtersOpen &&
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
        setError(e instanceof Error ? e.message : "Error");
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
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setPendingWorkspaceId(null);
      }
    },
    [activeWorkspaceId, refreshWorkspaceCurrency],
  );

  const handleApply = useCallback(() => {
    startFilterTransition(() => {
      setApplied(draft);
      setFiltersOpen(false);
    });
  }, [draft]);

  const handleReset = useCallback(() => {
    const fresh = defaultAnalyticsFilters();
    setDraft(fresh);
    setApplied(fresh);
  }, []);

  const loadError =
    error ??
    (workspaceStateQuery.error instanceof Error
      ? workspaceStateQuery.error.message
      : null) ??
    (chartLookupsQuery.error instanceof Error
      ? chartLookupsQuery.error.message
      : null) ??
    (filtersOpen && merchantLookupsQuery.error instanceof Error
      ? merchantLookupsQuery.error.message
      : null) ??
    (filtersOpen && recurrenceLookupsQuery.error instanceof Error
      ? recurrenceLookupsQuery.error.message
      : null);

  if (!workspaceReady && !workspaceStateQuery.data && !workspaceStateQuery.error) {
    return <MoneyAnalyticsTransactionsTableSkeleton />;
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 md:mb-4 fx-fade-in">
        <p className="max-w-prose text-sm text-muted">
          Browse and edit workspace transactions. Default range is the current
          calendar month — open Filter to change it.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setFiltersOpen(true)}
          trailing={
            dirty ? (
              <span
                className="size-1.5 rounded-full bg-accent/70"
                aria-hidden
              />
            ) : null
          }
        >
          Filter
          {dirty ? <span className="sr-only">Unapplied filter changes</span> : null}
        </Button>
      </div>

      {filtersOpen ? (
        <Modal
          open
          onClose={() => setFiltersOpen(false)}
          bare
          labelledBy="analytics-filters-heading"
        >
          <AnalyticsFilters
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
            onClose={() => setFiltersOpen(false)}
          />
        </Modal>
      ) : null}

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
