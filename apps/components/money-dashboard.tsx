"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MoneyLookupQuickPickSkeleton,
  MoneyTagsFieldSkeleton,
} from "@/components/money-dashboard-skeleton";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { useNotify } from "@/components/notification-provider";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  formatMinor,
  getCurrencySymbol,
  minorToMajorInput,
  parseMajorToMinor,
} from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_SET_ACTIVE_WORKSPACE_MUTATION,
  MONEY_TRANSACTION_CREATE_MUTATION,
} from "@/lib/money-gql-documents";
import {
  categoriesOfKind,
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
} from "@/lib/money-category-ui";
import {
  moneyFormLookupsQueryOptions,
  moneyWorkspaceStateQueryOptions,
  type MoneyAccountLookup,
  type MoneyCategoryLookup,
} from "@/lib/money-query-options";
import { mostUsedPickId } from "@/lib/money-usage-quick-pick";

type Account = MoneyAccountLookup;
type Category = MoneyCategoryLookup;

const KIND_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

type KindValue = (typeof KIND_OPTIONS)[number]["value"];

type WhenMode = "today" | "yesterday" | "custom";

const WHEN_OPTIONS: ReadonlyArray<{ id: WhenMode; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "custom", label: "Custom" },
];

function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateString(d);
}

function dateToOccurredAt(date: string): string {
  return `${date}T00:00`;
}

function defaultAccountId(
  accounts: readonly Account[],
  selectedId: string,
): string {
  if (accounts.length === 0) return "";
  if (selectedId && accounts.some((a) => a.id === selectedId)) return selectedId;
  return mostUsedPickId(
    accounts.map((a) => ({
      id: a.id,
      label: a.name,
      usageCount: a.usageCount,
    })),
  );
}

function defaultCategoryPick(
  allCategories: readonly Category[],
  transactionKind: KindValue,
  selectedId: string,
  emptySelectedOnOther: boolean,
): { id: string; emptyOnOther: boolean } {
  if (transactionKind === "transfer") {
    return { id: "", emptyOnOther: false };
  }
  const visible = categoriesOfKind(allCategories, transactionKind);
  if (selectedId && visible.some((c) => c.id === selectedId)) {
    return { id: selectedId, emptyOnOther: emptySelectedOnOther };
  }
  if (emptySelectedOnOther && selectedId === "") {
    return { id: "", emptyOnOther: true };
  }
  return {
    id: mostUsedPickId(
      visible.map((c) => ({
        id: c.id,
        label: c.name,
        usageCount: c.usageCount,
      })),
    ),
    emptyOnOther: false,
  };
}

function queryErrorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}

export function MoneyDashboard() {
  const { data: session, status } = useSession();
  const userSub = session?.user?.id;
  const notify = useNotify();
  const { formatDate } = useFormatDate();
  const {
    defaultCurrency,
    needsCurrencySetup,
    refreshWorkspaceCurrency,
    workspaceReady,
  } = useWorkspaceCurrency();
  const canRunMoneyQueries =
    status === "authenticated" && typeof window !== "undefined";
  const workspaceStateQuery = useQuery({
    ...moneyWorkspaceStateQueryOptions(),
    enabled: canRunMoneyQueries,
  });
  const formLookupsQuery = useQuery({
    ...moneyFormLookupsQueryOptions(),
    enabled: canRunMoneyQueries,
  });

  const workspaceState = workspaceStateQuery.data;
  const workspaces = useMemo(
    () => workspaceState?.workspaces ?? [],
    [workspaceState?.workspaces],
  );
  const coreWorkspaceId = workspaceState?.workspaceId ?? "";
  const loadedAccounts = useMemo(
    () => formLookupsQuery.data?.moneyAccounts ?? [],
    [formLookupsQuery.data?.moneyAccounts],
  );
  const loadedCategories = useMemo(
    () => formLookupsQuery.data?.moneyCategories ?? [],
    [formLookupsQuery.data?.moneyCategories],
  );
  const loadedMerchants = useMemo(
    () => formLookupsQuery.data?.moneyMerchants ?? [],
    [formLookupsQuery.data?.moneyMerchants],
  );
  const topAmounts = useMemo(
    () => formLookupsQuery.data?.moneyTopAmounts ?? [],
    [formLookupsQuery.data?.moneyTopAmounts],
  );

  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [kind, setKind] = useState<KindValue>("expense");
  const [amountMajor, setAmountMajor] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    dateToOccurredAt(localDateString()),
  );
  const [whenMode, setWhenMode] = useState<WhenMode>("today");
  const [customDate, setCustomDate] = useState<string>("");
  const customDateInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoryEmptyOnOther, setCategoryEmptyOnOther] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);
  const loadErr =
    bootstrapErr ??
    queryErrorMessage(workspaceStateQuery.error) ??
    queryErrorMessage(formLookupsQuery.error);
  const resolvedWorkspaceId = useMemo(() => {
    let resolvedId = coreWorkspaceId;
    if (!workspaces.some((w) => w.id === resolvedId)) {
      resolvedId =
        workspaces.find((w) => w.isDefault)?.id ??
        workspaces[0]?.id ??
        resolvedId;
    }
    return resolvedId;
  }, [coreWorkspaceId, workspaces]);
  const activeWorkspaceId = pendingWorkspaceId ?? resolvedWorkspaceId;
  const workspaceSyncPending =
    pendingWorkspaceId != null ||
    (resolvedWorkspaceId !== "" && resolvedWorkspaceId !== coreWorkspaceId);
  const lookupsReady =
    workspaceReady && !workspaceSyncPending && formLookupsQuery.isSuccess;
  const accountsReady = lookupsReady;
  const merchantPickerReady =
    lookupsReady;
  const accountEmptyMessage =
    !workspaceReady || workspaceStateQuery.isLoading || workspaceSyncPending
      ? "Loading accounts..."
      : formLookupsQuery.isError
        ? "Couldn’t load accounts."
        : "No accounts yet. Add one in Settings.";
  const categoryEmptyMessage =
    !workspaceReady || workspaceStateQuery.isLoading || workspaceSyncPending
      ? "Loading categories..."
      : formLookupsQuery.isError
        ? "Couldn’t load categories."
        : "No categories yet. Add one in Settings.";
  const merchantEmptyMessage =
    !workspaceReady || workspaceStateQuery.isLoading || workspaceSyncPending
      ? "Loading merchants..."
      : formLookupsQuery.isError
        ? "Couldn’t load merchants."
        : "No merchants yet. Add one in Settings.";
  const accounts = useMemo(
    () => (workspaceSyncPending ? [] : loadedAccounts),
    [workspaceSyncPending, loadedAccounts],
  );
  const categories = useMemo(
    () => (workspaceSyncPending ? [] : loadedCategories),
    [workspaceSyncPending, loadedCategories],
  );
  const merchants = useMemo(
    () => (workspaceSyncPending ? [] : loadedMerchants),
    [workspaceSyncPending, loadedMerchants],
  );
  const accountId = defaultAccountId(loadedAccounts, selectedAccountId);
  const categorySelection = useMemo(
    () =>
      defaultCategoryPick(
        loadedCategories,
        kind,
        selectedCategoryId,
        categoryEmptyOnOther,
      ),
    [loadedCategories, kind, selectedCategoryId, categoryEmptyOnOther],
  );
  const categoryId = categorySelection.id;
  const categoryOtherSelected = categorySelection.emptyOnOther;
  const merchantId =
    selectedMerchantId &&
    loadedMerchants.some((merchant) => merchant.id === selectedMerchantId)
      ? selectedMerchantId
      : "";
  const initialDashboardPending =
    status === "loading" ||
    workspaceStateQuery.isLoading ||
    !workspaceReady ||
    (formLookupsQuery.isLoading && !formLookupsQuery.data);
  const lookupSkeletonVisible = initialDashboardPending;

  const visibleCategories = useMemo(
    () => (kind === "transfer" ? [] : categoriesOfKind(categories, kind)),
    [categories, kind],
  );
  const categoryById = useMemo(
    () => moneyCategoryById(visibleCategories),
    [visibleCategories],
  );
  const categoryGroups = useMemo(() => {
    const groups = moneyCategorySelectGroups(visibleCategories);
    const rootOptions = groups
      .filter((group) => group.type === "single")
      .map((group) => ({
        id: group.category.id,
        label: moneyCategoryLabel(group.category, categoryById),
        isChild: false,
      }));
    const parentGroups = groups
      .filter((group) => group.type !== "single")
      .map((group) => ({
        key: `parent-${group.parent.id}`,
        label: group.parent.name,
        options: [
          {
            id: group.parent.id,
            label: `${group.parent.name} (all)`,
            isChild: false,
          },
          ...group.children.map((child) => ({
            id: child.id,
            label: moneyCategoryLabel(child, categoryById),
            isChild: true,
          })),
        ],
      }));
    return [
      {
        key: "none",
        label: "None",
        options: [{ id: "", label: "No category", isChild: false }],
      },
      ...(rootOptions.length > 0
        ? [
            {
              key: "root",
              label: "No parent",
              options: rootOptions,
            },
          ]
        : []),
      ...parentGroups,
    ];
  }, [visibleCategories, categoryById]);
  const categoryOptions = useMemo(
    () => categoryGroups.flatMap((group) => group.options),
    [categoryGroups],
  );
  const accountQuickItems = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        label: a.name,
        usageCount: a.usageCount,
      })),
    [accounts],
  );
  const accountBalanceById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.balanceMinor] as const)),
    [accounts],
  );
  const categoryQuickItems = useMemo(
    () =>
      visibleCategories.map((c) => ({
        id: c.id,
        label: moneyCategoryLabel(c, categoryById),
        usageCount: c.usageCount,
      })),
    [visibleCategories, categoryById],
  );
  const categoryPickerItems = useMemo(
    () =>
      categoryOptions.map((option) => ({
        id: option.id,
        label: option.label,
        isChild: option.isChild,
      })),
    [categoryOptions],
  );
  const merchantQuickItems = useMemo(
    () =>
      merchants.map((m) => ({
        id: m.id,
        label: m.name,
        usageCount: m.usageCount,
      })),
    [merchants],
  );
  const toAccountOptions = useMemo(
    () => accounts.filter((a) => a.id !== accountId),
    [accounts, accountId],
  );
  const effectiveToAccountId = useMemo(() => {
    if (kind !== "transfer") return "";
    if (
      toAccountId &&
      toAccountId !== accountId &&
      toAccountOptions.some((a) => a.id === toAccountId)
    ) {
      return toAccountId;
    }
    return toAccountOptions[0]?.id ?? "";
  }, [kind, toAccountId, accountId, toAccountOptions]);

  const autoSyncedWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!resolvedWorkspaceId || resolvedWorkspaceId === coreWorkspaceId) {
      autoSyncedWorkspaceRef.current = null;
      return;
    }
    if (!workspaces.some((workspace) => workspace.id === resolvedWorkspaceId)) {
      return;
    }

    const syncKey = `${coreWorkspaceId}:${resolvedWorkspaceId}`;
    if (autoSyncedWorkspaceRef.current === syncKey) return;
    autoSyncedWorkspaceRef.current = syncKey;

    let cancelled = false;
    void (async () => {
      try {
        await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
          workspaceId: resolvedWorkspaceId,
        });
        if (cancelled) return;
        setBootstrapErr(null);
        await refreshWorkspaceCurrency();
      } catch (e: unknown) {
        if (cancelled) return;
        autoSyncedWorkspaceRef.current = null;
        setBootstrapErr(e instanceof Error ? e.message : "Error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coreWorkspaceId, refreshWorkspaceCurrency, resolvedWorkspaceId, workspaces]);

  async function saveTransaction(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!workspaceReady) throw new Error("Workspace is still loading");
      if (needsCurrencySetup) throw new Error("Set a workspace currency first");
      if (workspaceSyncPending) throw new Error("Workspace is still switching");
      const minor = parseMajorToMinor(amountMajor, defaultCurrency);
      if (!accountId) throw new Error("Pick an account");
      if (minor == null || minor <= 0) throw new Error("Invalid amount");
      if (kind === "transfer" && !effectiveToAccountId) {
        throw new Error("Pick a destination account");
      }
      if (kind === "transfer" && effectiveToAccountId === accountId) {
        throw new Error("From and destination accounts must be different");
      }

      const body: Record<string, unknown> = {
        accountId,
        amountMinor: minor,
        kind,
      };
      if (kind === "transfer") body.toAccountId = effectiveToAccountId;
      if (occurredAt.trim()) {
        body.occurredAt = new Date(occurredAt).toISOString();
      }
      if (kind !== "transfer" && categoryId) body.categoryId = categoryId;
      if (merchantId) body.merchantId = merchantId;
      if (notes.trim()) body.notes = notes.trim();
      const tagNames = tagsInput
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const uniqueTagNames = [...new Set(tagNames)];
      if (uniqueTagNames.length > 0) body.tagNames = uniqueTagNames;

      await moneyGraphQLRequest(MONEY_TRANSACTION_CREATE_MUTATION, {
        input: body,
      });
      notify.success("Transaction added", "Your entry was saved.");
      setAmountMajor("");
      setNotes("");
      setTagsInput("");
      if (kind === "transfer") {
        setKind("expense");
        setToAccountId("");
      }
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save transaction",
        e instanceof Error ? e.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const pickWhenMode = (mode: WhenMode) => {
    if (mode === "today") {
      setWhenMode("today");
      setOccurredAt(dateToOccurredAt(localDateString()));
      return;
    }
    if (mode === "yesterday") {
      setWhenMode("yesterday");
      setOccurredAt(dateToOccurredAt(yesterdayDateString()));
      return;
    }
    const input = customDateInputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // showPicker can throw NotAllowedError without user activation; fall through to click()
    }
    input.focus();
    input.click();
  };

  const handleCustomDateChange = (value: string) => {
    if (!value) return;
    setCustomDate(value);
    setWhenMode("custom");
    setOccurredAt(dateToOccurredAt(value));
  };

  const submitDisabled =
    submitting ||
    !workspaceReady ||
    needsCurrencySetup ||
    workspaceSyncPending ||
    !accountsReady ||
    accounts.length === 0 ||
    !accountId ||
    (kind === "transfer" && !effectiveToAccountId);

  return (
    <div className="min-w-0 max-w-4xl space-y-6">
      {loadErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={loadErr}
        />
      ) : null}

      <Card className="p-5">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-medium tracking-tight">
            New transaction
          </h2>
          <span className="text-xs text-muted">
            {defaultCurrency}
          </span>
        </header>
        <form
          className="grid min-w-0 gap-4"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
          }}
          onSubmit={saveTransaction}
        >
          <fieldset className="grid min-w-0 gap-1.5 text-sm [grid-column:1/-1]">
            <legend className="text-muted">Kind</legend>
            <div
              role="radiogroup"
              aria-label="Transaction kind"
              className="inline-flex min-w-0 flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1"
            >
              {KIND_OPTIONS.map(({ value, label }) => {
                const active = kind === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setKind(value);
                      if (value !== "transfer") setToAccountId("");
                    }}
                    className={cn(
                      "min-w-20 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
                      active
                        ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                        : "text-muted hover:bg-muted-surface hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {workspaces.length > 1 ? (
            <Field label="Workspace" className="[grid-column:1/-1]">
              <Select
                value={activeWorkspaceId}
                disabled={workspaces.length === 0 || workspaceSyncPending}
                onChange={async (e) => {
                  const next = e.target.value;
                  if (!next || next === activeWorkspaceId) return;
                  try {
                    setBootstrapErr(null);
                    setPendingWorkspaceId(next);
                    await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
                      workspaceId: next,
                    });
                    await refreshWorkspaceCurrency();
                    setPendingWorkspaceId(null);
                    notify.success(
                      "Workspace switched",
                      "Ledger data was refreshed.",
                    );
                  } catch (err: unknown) {
                    setPendingWorkspaceId(null);
                    notify.error(
                      "Couldn’t switch workspace",
                      err instanceof Error ? err.message : "Something went wrong",
                    );
                  }
                }}
              >
                {workspaces.map((w) => {
                  const mine =
                    w.kind === "personal" &&
                    userSub &&
                    w.ownedByUserSub === userSub;
                  const label =
                    w.name +
                    (mine
                      ? " · Personal"
                      : w.kind === "shared"
                        ? " · Shared"
                        : "");
                  return (
                    <option key={w.id} value={w.id}>
                      {label}
                    </option>
                  );
                })}
              </Select>
              {workspaceSyncPending ? (
                <p className="mt-1 text-xs text-muted">Switching workspace…</p>
              ) : null}
            </Field>
          ) : null}

          <Field label="Amount" required>
            <InputGroup>
              <InputGroupAddon side="leading" aria-hidden>
                {getCurrencySymbol(defaultCurrency)}
              </InputGroupAddon>
              <InputGroupInput
                value={amountMajor}
                onChange={(e) => setAmountMajor(e.target.value)}
                inputMode="decimal"
                placeholder={defaultCurrency === "VND" ? "25" : "24.99"}
                autoFocus
                required
                aria-label="Amount"
              />
              <InputGroupAddon side="trailing" aria-hidden>
                {defaultCurrency}
              </InputGroupAddon>
            </InputGroup>
            {topAmounts.length > 0 ? (
              <>
                <p className="text-xs text-muted">
                  Tap a recent amount to fill · last 90 days
                </p>
                <div
                  role="group"
                  aria-label="Recent amounts"
                  className="flex min-w-0 flex-wrap gap-1.5"
                >
                {topAmounts.map((a) => {
                  const major = minorToMajorInput(
                    a.amountMinor,
                    defaultCurrency,
                  );
                  const formatted = formatMinor(a.amountMinor, defaultCurrency);
                  return (
                    <button
                      key={a.amountMinor}
                      type="button"
                      onClick={() => setAmountMajor(major)}
                      title={`Use ${formatted}`}
                      className={cn(
                        "cursor-pointer rounded-[var(--radius-sm)] border border-dashed border-border px-2.5 py-1 text-xs font-medium tabular-nums text-foreground underline decoration-transparent underline-offset-2 transition-[background-color,border-color,color,text-decoration-color] duration-200 hover:border-foreground/25 hover:bg-muted-surface hover:decoration-foreground/40 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring fx-press",
                      )}
                    >
                      {formatted}
                    </button>
                  );
                })}
                </div>
              </>
            ) : null}
          </Field>

          {lookupSkeletonVisible ? (
            <MoneyLookupQuickPickSkeleton
              legend="Account"
              required
              className="[grid-column:1/-1]"
            />
          ) : (
            <MoneyUsageQuickPick
              legend="Account"
              ariaLabel="Account"
              required
              className="[grid-column:1/-1]"
              items={accountQuickItems}
              selectedId={accountId}
              onSelect={setSelectedAccountId}
              otherLabel="Other account"
              emptyMessage={accountEmptyMessage}
              renderPickerRow={(item) =>
                formatMinor(
                  accountBalanceById.get(item.id) ?? 0,
                  defaultCurrency,
                )
              }
            />
          )}

          {kind === "transfer" ? (
            <Field label="To Account" required className="[grid-column:1/-1]">
              {lookupSkeletonVisible ? (
                <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
              ) : !accountsReady ? (
                <p className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-muted">
                  Loading accounts...
                </p>
              ) : toAccountOptions.length === 0 ? (
                <p className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-muted">
                  Add another account to create transfers.
                </p>
              ) : (
                <Select
                  value={effectiveToAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                >
                  {toAccountOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {formatMinor(a.balanceMinor, defaultCurrency)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}

          {kind !== "transfer" ? (
            lookupSkeletonVisible ? (
              <MoneyLookupQuickPickSkeleton
                legend="Category"
                className="[grid-column:1/-1]"
              />
            ) : (
              <MoneyUsageQuickPick
                legend="Category"
                ariaLabel="Category"
                className="[grid-column:1/-1]"
                items={categoryQuickItems}
                pickerItems={categoryPickerItems}
                selectedId={categoryId}
                onSelect={(id) => {
                  setSelectedCategoryId(id);
                  setCategoryEmptyOnOther(id === "");
                }}
                otherLabel="Other category"
                emptyCountsAsOther
                emptySelectedOnOther={categoryOtherSelected}
                emptyMessage={categoryEmptyMessage}
              />
            )
          ) : null}

          {lookupSkeletonVisible ? (
            <MoneyLookupQuickPickSkeleton legend="Merchant" chips={3} />
          ) : (
            <MoneyUsageQuickPick
              legend="Merchant"
              ariaLabel="Merchant"
              items={merchantQuickItems}
              selectedId={merchantId}
              onSelect={setSelectedMerchantId}
              otherLabel="Other merchant"
              allowEmpty={merchantPickerReady}
              emptyMessage={merchantEmptyMessage}
            />
          )}

          <fieldset className="grid min-w-0 gap-1.5 text-sm">
            <legend className="text-muted">When</legend>
            <div
              role="radiogroup"
              aria-label="Transaction date"
              className="inline-flex min-w-0 flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1"
            >
              {WHEN_OPTIONS.map((opt) => {
                const active = whenMode === opt.id;
                const isCustom = opt.id === "custom";
                const label =
                  isCustom && customDate
                    ? formatDate(customDate, { omitYearIfCurrent: true })
                    : opt.label;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickWhenMode(opt.id)}
                    className={cn(
                      "min-w-20 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
                      active
                        ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                        : "text-muted hover:bg-muted-surface hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <input
              ref={customDateInputRef}
              type="date"
              value={customDate}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />
          </fieldset>

          {lookupSkeletonVisible ? (
            <MoneyTagsFieldSkeleton className="[grid-column:1/-1]" />
          ) : (
            <Field
              label="Tags"
              hint="Separate tags with spaces. Tags are created and linked when you save."
              className="[grid-column:1/-1]"
            >
              <Input
                type="text"
                placeholder="groceries travel"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </Field>
          )}

          <Field label="Notes" className="[grid-column:1/-1]">
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3 [grid-column:1/-1]">
            <Button
              type="submit"
              size="lg"
              disabled={submitDisabled}
              aria-busy={submitting}
            >
              {submitting ? "Saving…" : "Save transaction"}
            </Button>
            <span aria-live="polite" className="text-xs text-muted">
              {kind === "transfer"
                ? "Transfers do not affect totals — only balances."
                : kind === "expense"
                  ? "Reduces account balance."
                  : "Increases account balance."}
            </span>
          </div>
        </form>
      </Card>
    </div>
  );
}
