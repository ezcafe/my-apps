"use client";

import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceCurrency } from "@/components/workspace-gate";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import {
  AnalyticsBudgetsSection,
  type AnalyticsBudgetRow,
} from "@/components/analytics-budgets-section";
import { AnalyticsStats } from "@/components/analytics-stats";
import { AnalyticsTransactionsTable } from "@/components/analytics-transactions-table";
import { colorByIndex } from "@/components/charts/chart-colors";
import { Alert } from "@/components/ui/alert";
import {
  defaultAnalyticsFilters,
  type AnalyticsFiltersValue,
  type AnalyticsLookupAccount,
  type AnalyticsLookupMerchant,
  type AnalyticsLookupTag,
  type AnalyticsWorkspaceRow,
} from "@/components/analytics-filters";

const AnalyticsFilters = dynamic(
  () =>
    import("@/components/analytics-filters").then((m) => ({
      default: m.AnalyticsFilters,
    })),
  { ssr: false },
);

const ColumnChart = dynamic(
  () =>
    import("@/components/charts/column-chart").then((m) => ({
      default: m.ColumnChart,
    })),
  { ssr: false },
);

const LineChart = dynamic(
  () =>
    import("@/components/charts/line-chart").then((m) => ({
      default: m.LineChart,
    })),
  { ssr: false },
);

const PieSpendChart = dynamic(
  () =>
    import("@/components/charts/pie-chart").then((m) => ({
      default: m.PieSpendChart,
    })),
  { ssr: false },
);

const SankeyChart = dynamic(
  () =>
    import("@/components/charts/sankey-chart").then((m) => ({
      default: m.SankeyChart,
    })),
  { ssr: false },
);
import { buildQuery, dateRangeParams } from "@/lib/analytics-build-query";
import { formatMinor } from "@/lib/format-money";
import { moneyApiJson } from "@/lib/money-fetch";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";
import { useInViewOnce } from "@/lib/use-in-view-once";

function ChartViewportFallback({
  minHeight,
  ariaLabel,
}: {
  minHeight: string;
  ariaLabel: string;
}) {
  return (
    <div
      className={`flex w-full min-h-0 min-w-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] text-xs text-muted ${minHeight}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      Chart loads when visible
    </div>
  );
}

type AnalyticsPayload = {
  pie: { label: string; valueMinor: number }[];
  column: { month: string; expenseMinor: number; incomeMinor: number }[];
  line: { date: string; cumulative: number }[];
  sankey: { nodes: { name: string }[]; links: { source: string; target: string; value: number }[] };
  stats: {
    expenseMinor: number;
    incomeMinor: number;
    netMinor: number;
    transactionCount: number;
  };
  range: { from: string; to: string };
};

export function AnalyticsDashboard() {
  const { data: session } = useSession();
  const userSub = session?.user?.id;
  const { defaultCurrency, refreshWorkspaceCurrency } = useWorkspaceCurrency();

  const {
    ref: spendByCategoryRef,
    isInView: spendByCategoryInView,
  } = useInViewOnce();
  const {
    ref: monthlyColumnsRef,
    isInView: monthlyColumnsInView,
  } = useInViewOnce();
  const { ref: netFlowRef, isInView: netFlowInView } = useInViewOnce();

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [budgets, setBudgets] = useState<AnalyticsBudgetRow[]>([]);
  const [budgetsError, setBudgetsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const [workspaces, setWorkspaces] = useState<AnalyticsWorkspaceRow[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);

  const [accounts, setAccounts] = useState<AnalyticsLookupAccount[]>([]);
  const [categories, setCategories] = useState<MoneyCategoryRow[]>([]);
  const [merchants, setMerchants] = useState<AnalyticsLookupMerchant[]>([]);
  const [tags, setTags] = useState<AnalyticsLookupTag[]>([]);

  const [draft, setDraft] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [applied, setApplied] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchSeq = useRef(0);

  const draftKey = useMemo(() => JSON.stringify(draft), [draft]);
  const appliedKey = useMemo(() => JSON.stringify(applied), [applied]);
  const dirty = draftKey !== appliedKey;

  const analyticsFilterQuery = useMemo(() => buildQuery(applied), [applied]);

  const pieHasData = data?.pie.some((p) => p.valueMinor > 0) ?? false;
  const columnHasExpense = data?.column.some((c) => c.expenseMinor > 0) ?? false;
  const sankeyHasData = (data?.sankey.links.length ?? 0) > 0;
  const lineHasData = (data?.line.length ?? 0) > 0;

  const loadLookups = useCallback(async () => {
    const [accRes, catRes, merRes, tagRes] = await Promise.all([
      moneyApiJson<AnalyticsLookupAccount[]>("/api/money/accounts"),
      moneyApiJson<MoneyCategoryRow[]>("/api/money/categories"),
      moneyApiJson<AnalyticsLookupMerchant[]>("/api/money/merchants"),
      moneyApiJson<AnalyticsLookupTag[]>("/api/money/tags"),
    ]);
    setAccounts(accRes.data);
    setCategories(catRes.data);
    setMerchants(merRes.data);
    setTags(tagRes.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data: boot } =
          await moneyApiJson<MoneyWorkspaceBootstrapData>(
            "/api/money/workspace/bootstrap",
          );
        if (cancelled) return;
        setWorkspaces(boot.workspaces);
        let resolvedId = boot.workspaceId;
        if (!boot.workspaces.some((w) => w.id === resolvedId)) {
          resolvedId =
            boot.workspaces.find((w) => w.isDefault)?.id ??
            boot.workspaces[0]?.id ??
            resolvedId;
        }
        setActiveWorkspaceId(resolvedId);
        if (
          resolvedId &&
          resolvedId !== boot.workspaceId &&
          boot.workspaces.some((w) => w.id === resolvedId)
        ) {
          await moneyApiJson("/api/workspace/active", {
            method: "POST",
            body: JSON.stringify({ workspaceId: resolvedId, app: "money" }),
          });
          await refreshWorkspaceCurrency();
        }
        if (cancelled) return;
        setAccounts(boot.accounts);
        setCategories(boot.categories);
        setMerchants(boot.merchants);
        setTags(boot.tags);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshWorkspaceCurrency]);

  useEffect(() => {
    if (!filtersOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const seq = ++fetchSeq.current;
    queueMicrotask(() => {
      void (async () => {
        setApplying(true);
        setError(null);
        const qs = buildQuery(applied);
        const url =
          qs.length > 0 ? `/api/money/analytics?${qs}` : "/api/money/analytics";
        try {
          const { data: payload } = await moneyApiJson<AnalyticsPayload>(url);
          if (seq !== fetchSeq.current) return;
          setData(payload);
        } catch (e: unknown) {
          if (seq !== fetchSeq.current) return;
          setError(e instanceof Error ? e.message : "Error");
        } finally {
          if (seq === fetchSeq.current) setApplying(false);
        }
      })();
    });
  }, [applied, activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const defaultDates = defaultAnalyticsFilters();
          const fromDate = applied.fromDate || defaultDates.fromDate;
          const toDate = applied.toDate || defaultDates.toDate;
          const { from, to } = dateRangeParams(fromDate, toDate);
          const qs = new URLSearchParams();
          qs.set("includeSpent", "1");
          qs.set("from", from);
          qs.set("to", to);
          const { data: payload } = await moneyApiJson<AnalyticsBudgetRow[]>(
            `/api/money/budgets?${qs.toString()}`,
          );
          if (cancelled) return;
          setBudgets(payload);
          setBudgetsError(null);
        } catch (e: unknown) {
          if (cancelled) return;
          setBudgetsError(e instanceof Error ? e.message : "Error");
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, applied.fromDate, applied.toDate]);

  const handleWorkspaceChange = useCallback(
    async (next: string) => {
      if (!next || next === activeWorkspaceId) return;
      setSwitchingWorkspace(true);
      setError(null);
      try {
        await moneyApiJson("/api/workspace/active", {
          method: "POST",
          body: JSON.stringify({ workspaceId: next, app: "money" }),
        });
        setActiveWorkspaceId(next);
        await refreshWorkspaceCurrency();
        const fresh = defaultAnalyticsFilters();
        setDraft(fresh);
        setApplied(fresh);
        await loadLookups();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setSwitchingWorkspace(false);
      }
    },
    [activeWorkspaceId, loadLookups, refreshWorkspaceCurrency],
  );

  const handleApply = useCallback(() => {
    setApplied(draft);
    setFiltersOpen(false);
  }, [draft]);

  const handleReset = useCallback(() => {
    const fresh = defaultAnalyticsFilters();
    setDraft(fresh);
    setApplied(fresh);
  }, []);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 md:mb-4">
        <p className="max-w-prose text-sm text-muted">
          Workspace-scoped aggregates for the range you set in Filter (default: start through end of
          the current calendar month). Apply to refresh charts.
        </p>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
          onClick={() => setFiltersOpen(true)}
        >
          Filter
          {dirty ? (
            <span className="size-1.5 rounded-full bg-foreground/70" aria-hidden />
          ) : null}
          {dirty ? <span className="sr-only">Unapplied filter changes</span> : null}
        </button>
      </div>

      {filtersOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="presentation"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/45"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
              />
              <div
                className="relative z-10 max-h-[min(90dvh,52rem)] w-full max-w-4xl overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="analytics-filters-heading"
              >
                <AnalyticsFilters
                  value={draft}
                  onChange={setDraft}
                  onApply={handleApply}
                  onReset={handleReset}
                  applying={applying}
                  dirty={dirty}
                  accounts={accounts}
                  categories={categories}
                  merchants={merchants}
                  tags={tags}
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  onWorkspaceChange={handleWorkspaceChange}
                  switchingWorkspace={switchingWorkspace}
                  userSub={userSub}
                  onClose={() => setFiltersOpen(false)}
                />
              </div>
            </div>,
            document.body,
          )
        : null}

      <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3">
        {error ? (
          <div className="col-span-2 md:col-span-6 lg:col-span-12">
            <Alert variant="error" title="Couldn’t load analytics" description={error} />
          </div>
        ) : null}

        {!data ? (
          <p className="col-span-2 text-sm text-muted md:col-span-6 lg:col-span-12">
            Loading charts…
          </p>
        ) : (
          <>
            <AnalyticsStats
              stats={data.stats}
              column={data.column}
              range={data.range}
              currency={defaultCurrency}
            />

            <section className="col-span-2 w-full min-w-0 rounded-md border border-border bg-surface p-4 md:col-span-6 lg:col-span-12">
              <h2 className="mb-2 text-lg font-medium">
                Sankey (account → category, expenses)
              </h2>
              <div className="relative h-[320px] w-full min-h-0 min-w-0 text-foreground">
                {sankeyHasData ? (
                  <div className="absolute inset-0 min-h-0 min-w-0">
                    <SankeyChart nodes={data.sankey.nodes} links={data.sankey.links} />
                  </div>
                ) : (
                  <AnalyticsEmptyState
                    icon="flow"
                    title="No expense flow for this range"
                    description="Add categorized expenses or widen the date range."
                    minHeightClass="min-h-0"
                    className="absolute inset-0 overflow-y-auto"
                    action={{ href: "/money", label: "Add or view transactions" }}
                  />
                )}
              </div>
            </section>

            <div className="col-span-2 grid min-w-0 grid-cols-1 gap-2 md:col-span-6 md:grid-cols-2 md:gap-3 lg:col-span-12 lg:gap-3">
              <div
                ref={spendByCategoryRef}
                className="min-w-0 rounded-md border border-border bg-surface p-4"
              >
                <h2 className="mb-2 text-lg font-medium">Spend by category</h2>
                {spendByCategoryInView ? (
                  pieHasData ? (
                    <>
                      <div className="relative h-[240px] w-full min-h-0 min-w-0">
                        <PieSpendChart data={data.pie} />
                      </div>
                      <ul className="mt-3 space-y-1 text-xs text-muted">
                        {data.pie.slice(0, 8).map((p, i) => (
                          <li key={p.label} className="flex justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2 truncate">
                              <span
                                className="inline-block size-2 rounded-full"
                                style={{ backgroundColor: colorByIndex(i) }}
                                aria-hidden
                              />
                              <span className="truncate">{p.label}</span>
                            </span>
                            <span>{formatMinor(p.valueMinor, defaultCurrency)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <AnalyticsEmptyState
                      title="No category spend in this range"
                      description="Add expenses or adjust filters for this range."
                      minHeightClass="h-[240px] overflow-y-auto"
                      action={{ href: "/money", label: "Add or view transactions" }}
                    />
                  )
                ) : (
                  <ChartViewportFallback
                    minHeight="h-[240px]"
                    ariaLabel="Spend by category chart loads when this section is visible"
                  />
                )}
              </div>

              <div
                ref={monthlyColumnsRef}
                className="min-w-0 rounded-md border border-border bg-surface p-4"
              >
                <h2 className="mb-2 text-lg font-medium">
                  Monthly expense columns
                </h2>
                {monthlyColumnsInView ? (
                  columnHasExpense ? (
                    <div className="relative h-[240px] w-full min-h-0 min-w-0">
                      <ColumnChart data={data.column} />
                    </div>
                  ) : (
                    <AnalyticsEmptyState
                      title="No monthly expenses to plot"
                      description="Add expenses or widen the range to see bars."
                      minHeightClass="h-[240px] overflow-y-auto"
                      action={{ href: "/money", label: "Add or view transactions" }}
                    />
                  )
                ) : (
                  <ChartViewportFallback
                    minHeight="h-[240px]"
                    ariaLabel="Monthly expense columns chart loads when this section is visible"
                  />
                )}
              </div>
            </div>

            <div
              ref={netFlowRef}
              className="col-span-2 w-full min-w-0 rounded-md border border-border bg-surface p-4 md:col-span-6 lg:col-span-12"
            >
              <h2 className="mb-2 text-lg font-medium">Net cumulative flow</h2>
              <div className="relative h-[240px] w-full min-h-0 min-w-0">
                {netFlowInView ? (
                  lineHasData ? (
                    <LineChart data={data.line} />
                  ) : (
                    <AnalyticsEmptyState
                      title="No cash flow in this range"
                      description="Widen the range or add transactions."
                      descriptionClassName="line-clamp-1"
                      minHeightClass="h-[240px] overflow-y-auto"
                      action={{ href: "/money", label: "Add or view transactions" }}
                    />
                  )
                ) : (
                  <ChartViewportFallback
                    minHeight="h-[240px]"
                    ariaLabel="Net cumulative flow chart loads when this section is visible"
                  />
                )}
              </div>
            </div>
          </>
        )}

        {activeWorkspaceId ? (
          budgetsError ? (
            <div className="col-span-2 md:col-span-6 lg:col-span-12">
              <Alert
                variant="error"
                title="Couldn’t load budgets"
                description={budgetsError}
              />
            </div>
          ) : (
            <AnalyticsBudgetsSection
              budgets={budgets}
              categories={categories}
              accounts={accounts}
              tags={tags}
              currency={defaultCurrency}
            />
          )
        ) : null}

        {activeWorkspaceId ? (
          <AnalyticsTransactionsTable
            filterQuery={analyticsFilterQuery}
            activeWorkspaceId={activeWorkspaceId}
            accounts={accounts}
            categories={categories}
            currency={defaultCurrency}
          />
        ) : null}
      </div>
    </>
  );
}
