"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MoneyLookupQuickPickSkeleton,
  MoneyTagsFieldSkeleton,
} from "@/components/money-dashboard-skeleton";
import {
  BudgetUtilizationFillLayer,
  budgetFillTitle,
  MoneyUsageQuickPick,
} from "@/components/money-usage-quick-pick";
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
  utcCalendarMonthKey,
  utcCalendarMonthRangeIso,
} from "@/lib/budget-utc-month-range";
import {
  budgetUtilizationAnalyticsFill,
  budgetUtilizationChipFill,
  budgetUtilizationPctTextClassName,
} from "@/lib/budget-utilization-chart-colors";
import {
  categoriesOfKind,
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
} from "@/lib/money-category-ui";
import {
  moneyFormBudgetStatusQueryOptions,
  moneyFormLookupsQueryOptions,
  moneyWorkspaceStateQueryOptions,
  refetchMoneyFormBudgetStatus,
  type MoneyAccountLookup,
  type MoneyCategoryLookup,
  type MoneyTagLookup,
} from "@/lib/money-query-options";
import { mostUsedPickId, topUsageItems, usageOrZero } from "@/lib/money-usage-quick-pick";
import {
  getRecurrenceFormCadences,
  cadenceLabel,
  type RecurrenceFormCadence,
} from "@/lib/recurrence";

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

export type MoneyTransactionFormMode = "transaction" | "recurrence";

export type MoneyTransactionFormProps = {
  mode: MoneyTransactionFormMode;
  onSuccess?: () => void;
};

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

function tagsInputTokens(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

function tagInputParts(input: string): { committed: string[]; current: string } {
  if (/\s$/.test(input)) {
    return { committed: tagsInputTokens(input), current: "" };
  }
  const tokens = input.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { committed: [], current: "" };
  return {
    committed: tokens.slice(0, -1),
    current: tokens[tokens.length - 1] ?? "",
  };
}

function appendTagName(input: string, name: string): string {
  const tokens = tagsInputTokens(input);
  if (tokens.includes(name)) return input;
  return tokens.length === 0 ? name : `${input.trim()} ${name}`;
}

function completeTagToken(input: string, tagName: string): string {
  const { committed } = tagInputParts(input);
  const prefix = committed.length > 0 ? `${committed.join(" ")} ` : "";
  return `${prefix}${tagName} `;
}

function formatTagBudgetPct(progressPct: number): string {
  return progressPct >= 100 ? progressPct.toFixed(0) : progressPct.toFixed(1);
}

function tagAutocompleteMatches(
  input: string,
  tags: readonly MoneyTagLookup[],
): MoneyTagLookup[] {
  const { committed, current } = tagInputParts(input);
  const q = current.toLowerCase();
  if (!q) return [];
  const committedSet = new Set(committed);
  return tags
    .filter(
      (t) =>
        !committedSet.has(t.name) && t.name.toLowerCase().startsWith(q),
    )
    .sort(
      (a, b) =>
        usageOrZero(b) - usageOrZero(a) || a.name.localeCompare(b.name),
    )
    .slice(0, 8);
}

function deriveRecurrenceName(opts: {
  notes: string;
  merchantName: string | undefined;
  categoryLabel: string | undefined;
  kind: KindValue;
}): string {
  const trimmedNotes = opts.notes.trim();
  if (trimmedNotes) return trimmedNotes.slice(0, 200);
  if (opts.merchantName) return opts.merchantName.slice(0, 200);
  if (opts.categoryLabel) return opts.categoryLabel.slice(0, 200);
  return `Recurring ${opts.kind}`;
}

export function MoneyTransactionForm({ mode, onSuccess }: MoneyTransactionFormProps) {
  const isRecurrenceMode = mode === "recurrence";
  const { data: session, status } = useSession();
  const userSub = session?.user?.id;
  const notify = useNotify();
  const queryClient = useQueryClient();
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
  const loadedTags = useMemo(
    () => formLookupsQuery.data?.moneyTags ?? [],
    [formLookupsQuery.data?.moneyTags],
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
  const [tagSuggestFocused, setTagSuggestFocused] = useState(false);
  const [tagSuggestHighlight, setTagSuggestHighlight] = useState(-1);
  const tagSuggestListId = useId();
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(isRecurrenceMode);
  const [recurrenceCadence, setRecurrenceCadence] =
    useState<RecurrenceFormCadence>("monthly");

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

  const budgetMonthInstant = useMemo(
    () => new Date(occurredAt),
    [occurredAt],
  );
  const budgetMonthKey = useMemo(
    () => utcCalendarMonthKey(budgetMonthInstant),
    [budgetMonthInstant],
  );
  const budgetMonthRange = useMemo(
    () => utcCalendarMonthRangeIso(budgetMonthInstant),
    [budgetMonthInstant],
  );
  const formBudgetStatusQuery = useQuery({
    ...moneyFormBudgetStatusQueryOptions(
      activeWorkspaceId,
      budgetMonthKey,
      budgetMonthRange.from,
      budgetMonthRange.to,
    ),
    enabled:
      canRunMoneyQueries &&
      lookupsReady &&
      Boolean(activeWorkspaceId),
  });
  const formBudgetPctById = formBudgetStatusQuery.data;

  const categoryChipBudgetProgressPct = useCallback(
    (id: string) => {
      if (kind !== "expense" || !id || !formBudgetPctById) return undefined;
      return formBudgetPctById.categories.get(id);
    },
    [formBudgetPctById, kind],
  );

  const accountChipBudgetProgressPct = useCallback(
    (id: string) => {
      if (!id || !formBudgetPctById) return undefined;
      return formBudgetPctById.accounts.get(id);
    },
    [formBudgetPctById],
  );

  const tagChipBudgetProgressPct = useCallback(
    (id: string) => {
      if (!id || !formBudgetPctById) return undefined;
      return formBudgetPctById.tags.get(id);
    },
    [formBudgetPctById],
  );

  const accountsReady = lookupsReady;
  const merchantPickerReady = lookupsReady;
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
  const topTagSuggestions = useMemo(
    () =>
      topUsageItems(
        loadedTags
          .filter((t) => usageOrZero(t) > 0)
          .map((t) => ({
            id: t.id,
            label: t.name,
            usageCount: t.usageCount,
          })),
        3,
      ),
    [loadedTags],
  );
  const tagAutocompleteOptions = useMemo(
    () => tagAutocompleteMatches(tagsInput, loadedTags),
    [tagsInput, loadedTags],
  );
  const showTagSuggest =
    tagSuggestFocused && tagAutocompleteOptions.length > 0;
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

  const pickTagSuggestion = useCallback((name: string) => {
    setTagsInput((prev) => completeTagToken(prev, name));
    setTagSuggestHighlight(-1);
  }, []);

  useEffect(() => {
    setTagSuggestHighlight(tagAutocompleteOptions.length > 0 ? 0 : -1);
  }, [tagAutocompleteOptions]);

  function handleTagsInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showTagSuggest) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setTagSuggestHighlight((i) =>
        Math.min(i + 1, tagAutocompleteOptions.length - 1),
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setTagSuggestHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && tagSuggestHighlight >= 0) {
      const picked = tagAutocompleteOptions[tagSuggestHighlight];
      if (picked) {
        e.preventDefault();
        pickTagSuggestion(picked.name);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setTagSuggestHighlight(-1);
      setTagSuggestFocused(false);
    }
  }

  const recurrenceCadenceOptions = useMemo(
    () => getRecurrenceFormCadences(),
    [],
  );
  const recurrenceActive =
    isRecurrenceMode || (recurrenceEnabled && kind !== "transfer");
  const selectedMerchantName = merchantId
    ? merchants.find((m) => m.id === merchantId)?.name
    : undefined;
  const selectedCategoryLabel = categoryId
    ? categoryOptions.find((option) => option.id === categoryId)?.label
    : undefined;

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

  function resetFormFields() {
    setAmountMajor("");
    setNotes("");
    setTagsInput("");
    if (!isRecurrenceMode) {
      setRecurrenceEnabled(false);
      setRecurrenceCadence("monthly");
    }
    if (kind === "transfer") {
      setKind("expense");
      setToAccountId("");
    }
  }

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
      if (isRecurrenceMode && kind === "transfer") {
        throw new Error("Recurring transfers are not supported");
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

      if (recurrenceActive) {
        body.recurrence = {
          cadence: recurrenceCadence,
          name: deriveRecurrenceName({
            notes,
            merchantName: selectedMerchantName,
            categoryLabel: selectedCategoryLabel,
            kind,
          }),
        };
      }

      await moneyGraphQLRequest(MONEY_TRANSACTION_CREATE_MUTATION, {
        input: body,
      });

      if (kind === "expense") {
        await refetchMoneyFormBudgetStatus(queryClient, activeWorkspaceId);
      }

      if (isRecurrenceMode) {
        notify.success(
          "Recurring transaction saved",
          "The schedule was created and the first entry was posted.",
        );
      } else if (recurrenceActive) {
        notify.success(
          "Transaction added",
          "Your entry was saved with a recurrence schedule.",
        );
      } else {
        notify.success("Transaction added", "Your entry was saved.");
      }

      resetFormFields();
      onSuccess?.();
    } catch (e: unknown) {
      notify.error(
        isRecurrenceMode
          ? "Couldn’t save recurring transaction"
          : "Couldn’t save transaction",
        e instanceof Error ? e.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const pickWhenMode = (when: WhenMode) => {
    if (when === "today") {
      setWhenMode("today");
      setOccurredAt(dateToOccurredAt(localDateString()));
      return;
    }
    if (when === "yesterday") {
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
    (kind === "transfer" && !effectiveToAccountId) ||
    (isRecurrenceMode && kind === "transfer");

  const cardTitle = isRecurrenceMode
    ? "New recurring transaction"
    : "New transaction";
  const submitLabel = submitting
    ? "Saving…"
    : isRecurrenceMode
      ? "Save recurring transaction"
      : "Save transaction";

  return (
    <>
      {loadErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={loadErr}
          className="mb-6"
        />
      ) : null}

      <Card className="p-5">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-medium tracking-tight">
            {cardTitle}
          </h2>
          <span className="text-xs text-muted">{defaultCurrency}</span>
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
                      if (value !== "transfer") {
                        setToAccountId("");
                      } else if (!isRecurrenceMode) {
                        setRecurrenceEnabled(false);
                      }
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
              chipBudgetProgressPct={accountChipBudgetProgressPct}
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
                chipBudgetProgressPct={categoryChipBudgetProgressPct}
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
              <div className="relative min-w-0">
                <Input
                  type="text"
                  placeholder="groceries travel"
                  value={tagsInput}
                  role="combobox"
                  aria-expanded={showTagSuggest}
                  aria-controls={showTagSuggest ? tagSuggestListId : undefined}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    showTagSuggest && tagSuggestHighlight >= 0
                      ? `${tagSuggestListId}-opt-${tagSuggestHighlight}`
                      : undefined
                  }
                  onChange={(e) => setTagsInput(e.target.value)}
                  onFocus={() => setTagSuggestFocused(true)}
                  onBlur={() => setTagSuggestFocused(false)}
                  onKeyDown={handleTagsInputKeyDown}
                />
                {showTagSuggest ? (
                  <ul
                    id={tagSuggestListId}
                    role="listbox"
                    aria-label="Matching tags"
                    className="absolute start-0 top-[calc(100%+0.25rem)] z-50 max-h-48 w-full min-w-0 overflow-auto rounded-[var(--radius-md)] border border-border bg-surface p-1 shadow-[var(--shadow-md)]"
                  >
                    {tagAutocompleteOptions.map((tag, index) => {
                      const selected = index === tagSuggestHighlight;
                      const fill = budgetUtilizationAnalyticsFill(
                        tagChipBudgetProgressPct(tag.id),
                      );
                      return (
                        <li key={tag.id} role="presentation">
                          <button
                            id={`${tagSuggestListId}-opt-${index}`}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickTagSuggestion(tag.name)}
                            title={fill ? budgetFillTitle(fill) : undefined}
                            className={cn(
                              "relative isolate flex w-full items-center justify-between gap-2 overflow-hidden rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-[background-color,color] duration-150",
                              selected
                                ? "bg-accent text-accent-foreground"
                                : "text-foreground hover:bg-muted-surface",
                            )}
                          >
                            {fill ? <BudgetUtilizationFillLayer fill={fill} /> : null}
                            <span className="relative z-[1] min-w-0 truncate">
                              {tag.name}
                            </span>
                            {fill ? (
                              <span
                                className={cn(
                                  "relative z-[1] shrink-0 text-xs tabular-nums",
                                  budgetUtilizationPctTextClassName(
                                    fill.progressPct,
                                    { selected },
                                  ),
                                )}
                              >
                                {formatTagBudgetPct(fill.progressPct)}%
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
              {topTagSuggestions.length > 0 ? (
                <>
                  <p className="text-xs text-muted">
                    Tap a tag to add · last 90 days
                  </p>
                  <div
                    role="group"
                    aria-label="Frequent tags"
                    className="flex min-w-0 flex-wrap gap-1.5"
                  >
                    {topTagSuggestions.map((tag) => {
                      const fill = budgetUtilizationChipFill(
                        tagChipBudgetProgressPct(tag.id),
                      );
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() =>
                            setTagsInput((prev) => appendTagName(prev, tag.label))
                          }
                          title={
                            fill ? budgetFillTitle(fill) : `Add ${tag.label}`
                          }
                          className={cn(
                            "relative isolate cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border border-dashed border-border px-2.5 py-1 text-xs font-medium text-foreground underline decoration-transparent underline-offset-2 transition-[background-color,border-color,color,text-decoration-color] duration-200 hover:border-foreground/25 hover:bg-muted-surface hover:decoration-foreground/40 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring fx-press",
                          )}
                        >
                          {fill ? <BudgetUtilizationFillLayer fill={fill} /> : null}
                          <span className="relative z-[1]">{tag.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </Field>
          )}

          <Field label="Notes" className="[grid-column:1/-1]">
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          {kind !== "transfer" ? (
            <div className="grid min-w-0 gap-3 [grid-column:1/-1]">
              {!isRecurrenceMode ? (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={recurrenceEnabled}
                    onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                    className="rounded-[var(--radius-sm)] border-border"
                  />
                  Repeat this transaction
                </label>
              ) : (
                <p className="text-sm text-muted">
                  This transaction will repeat on the schedule below.
                </p>
              )}
              {recurrenceActive ? (
                <Field label="Repeat every">
                  <Select
                    value={recurrenceCadence}
                    onChange={(e) =>
                      setRecurrenceCadence(e.target.value as RecurrenceFormCadence)
                    }
                  >
                    {recurrenceCadenceOptions.map((cadence) => (
                      <option key={cadence} value={cadence}>
                        {cadenceLabel(cadence)}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>
          ) : isRecurrenceMode ? (
            <p className="text-sm text-muted [grid-column:1/-1]">
              Recurring transfers are not supported yet.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 [grid-column:1/-1]">
            <Button
              type="submit"
              size="lg"
              disabled={submitDisabled}
              aria-busy={submitting}
            >
              {submitLabel}
            </Button>
            <span aria-live="polite" className="text-xs text-muted">
              {kind === "transfer"
                ? "Transfers do not affect totals — only balances."
                : recurrenceActive
                  ? "Creates the first entry and schedules future repeats."
                  : kind === "expense"
                    ? "Reduces account balance."
                    : "Increases account balance."}
            </span>
          </div>
        </form>
      </Card>
    </>
  );
}
