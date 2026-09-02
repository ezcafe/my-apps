"use client";

import { cn } from "@/lib/cn";
import { presentClientError, queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  InvestmentActivityFieldsSkeleton,
  MoneyLookupQuickPickSkeleton,
  MoneyTagsFieldSkeleton,
} from "@/components/money-dashboard-skeleton";
import {
  joinDateTimeLocal,
  localDateString,
  MoneyDateQuickPick,
  splitDateTimeLocal,
} from "@/components/money-date-quick-pick";
import {
  BudgetUtilizationFillLayer,
  budgetFillTitle,
  MoneyUsageQuickPick,
} from "@/components/money-usage-quick-pick";
import { useNotify } from "@/components/notification-provider";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { instrumentLedgerPrefill, type InstrumentLedgerDefaults } from "@/lib/instrument-ledger-prefill";
import {
  formatMinor,
  formatPnlMajorInput,
  getCurrencySymbol,
  minorToMajorInput,
  parseMajorToMinor,
} from "@/lib/format-money";
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
  formatBudgetUtilizationPct,
} from "@/lib/budget-utilization-chart-colors";
import {
  categoriesOfKind,
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
} from "@/lib/money-category-ui";
import {
  invalidateMoneyWorkspaceQueries,
  moneyBootstrapQueryOptions,
  moneyFormBudgetStatusQueryOptions,
  moneyFormLookupsQueryOptions,
  refetchMoneyFormBudgetStatus,
  type MoneyAccountLookup,
  type MoneyCategoryLookup,
  type MoneyTagLookup,
} from "@/lib/money-query-options";
import { preferredExpenseCategoryIdForAccountType } from "@/lib/money-seed-defaults";
import {
  expenseCategoryKindForFormKind,
  parseInstrumentId,
  parseMoneyFormKind,
  preferredAccountIdForFormKind,
  preferredCategoryIdForFormKind,
  type MoneyFormKind,
} from "@/lib/money-form-kind-defaults";
import { mostUsedPickId, topUsageItems, usageOrZero } from "@/lib/money-usage-quick-pick";
import type { InvestmentActivityFieldsHandle } from "@/components/investment-activity-fields";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import { LOAN_INSTALLMENT_PAY_MUTATION } from "@/lib/loans-gql-documents";
import { loansKeys } from "@/lib/loans-query-options";
import {
  moneyQuickPickChipCls,
  moneyQuickPickGroupCls,
} from "@/lib/money-quick-pick-chip-cls";
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
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
] as const;

type KindValue = MoneyFormKind;

const InvestmentActivityFieldsLazy = dynamic(
  () =>
    import("@/components/investment-activity-fields").then((mod) => ({
      default: mod.InvestmentActivityFields,
    })),
  { loading: () => <InvestmentActivityFieldsSkeleton /> },
);

const LoanPaymentFieldsLazy = dynamic(
  () =>
    import("@/components/loan-payment-fields").then((mod) => ({
      default: mod.LoanPaymentFields,
    })),
);

export type MoneyTransactionFormMode = "transaction" | "recurrence";

export type MoneyTransactionFormProps = {
  mode: MoneyTransactionFormMode;
  onSuccess?: () => void;
  initialKind?: string | null;
  initialInstrumentId?: string | null;
};

function dateToOccurredAt(date: string): string {
  return joinDateTimeLocal(date, "00:00");
}

function defaultAccountId(
  accounts: readonly Account[],
  selectedId: string,
  preferredId?: string,
): string {
  if (accounts.length === 0) return "";
  if (selectedId && accounts.some((a) => a.id === selectedId)) return selectedId;
  if (preferredId && accounts.some((a) => a.id === preferredId)) return preferredId;
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
  preferredCategoryId?: string,
  visibleCategoryKind?: "expense" | "income" | null,
): { id: string; emptyOnOther: boolean } {
  if (transactionKind === "transfer") {
    return { id: "", emptyOnOther: false };
  }
  const categoryKind =
    visibleCategoryKind ??
    expenseCategoryKindForFormKind(transactionKind) ??
    "expense";
  const visible = categoriesOfKind(allCategories, categoryKind);
  if (selectedId && visible.some((c) => c.id === selectedId)) {
    return { id: selectedId, emptyOnOther: emptySelectedOnOther };
  }
  if (emptySelectedOnOther && selectedId === "") {
    return { id: "", emptyOnOther: true };
  }
  if (
    preferredCategoryId &&
    visible.some((c) => c.id === preferredCategoryId)
  ) {
    return { id: preferredCategoryId, emptyOnOther: false };
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

export function MoneyTransactionForm({
  mode,
  onSuccess,
  initialKind,
  initialInstrumentId,
}: MoneyTransactionFormProps) {
  const isRecurrenceMode = mode === "recurrence";
  const { data: session, status } = useSession();
  const userSub = session?.user?.id;
  const notify = useNotify();
  const queryClient = useQueryClient();
  const {
    defaultCurrency,
    needsCurrencySetup,
    refreshWorkspaceCurrency,
    workspaceReady,
  } = useWorkspaceCurrency();
  const canRunMoneyQueries = status === "authenticated";
  const workspaceStateQuery = useQuery({
    ...moneyBootstrapQueryOptions(),
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
  const [kind, setKind] = useState<KindValue>(
    () => parseMoneyFormKind(initialKind) ?? "expense",
  );
  const instrumentPrefillId = parseInstrumentId(initialInstrumentId);
  const investmentFieldsRef = useRef<InvestmentActivityFieldsHandle>(null);
  const [investmentPnlMinor, setInvestmentPnlMinor] = useState<number | null>(
    null,
  );
  const [investmentPnlMajor, setInvestmentPnlMajor] = useState<number | null>(
    null,
  );
  const [instrumentLedgerDefaults, setInstrumentLedgerDefaults] =
    useState<InstrumentLedgerDefaults | null>(null);
  const handleInvestmentPreview = useCallback(
    (result: { signedMinor: number; signedMajor: number } | null) => {
      setInvestmentPnlMinor(result?.signedMinor ?? null);
      setInvestmentPnlMajor(result?.signedMajor ?? null);
    },
    [],
  );
  const handleInstrumentLedgerDefaults = useCallback(
    (defaults: InstrumentLedgerDefaults | null) => {
      setInstrumentLedgerDefaults(defaults);
    },
    [],
  );
  const [loanId, setLoanId] = useState("");
  const [loanInstallmentId, setLoanInstallmentId] = useState("");
  const handleSelectLoan = useCallback((id: string, installmentId: string) => {
    setLoanId(id);
    setLoanInstallmentId(installmentId);
  }, []);
  const [amountMajor, setAmountMajor] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    dateToOccurredAt(localDateString()),
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoryEmptyOnOther, setCategoryEmptyOnOther] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [notes, setNotes] = useState("");
  const [excludeFromAnalyticsAndBudget, setExcludeFromAnalyticsAndBudget] =
    useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [tagSuggestFocused, setTagSuggestFocused] = useState(false);
  const tagSuggestListId = useId();
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(isRecurrenceMode);
  const [recurrenceCadence, setRecurrenceCadence] =
    useState<RecurrenceFormCadence>("monthly");
  const [showMoreDetails, setShowMoreDetails] = useState(isRecurrenceMode);

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
  const kindPreferredAccountId = useMemo(() => {
    const fromInstrument = instrumentLedgerPrefill(
      instrumentLedgerDefaults,
      null,
    ).accountId;
    if (fromInstrument) return fromInstrument;
    return preferredAccountIdForFormKind(kind, loadedAccounts);
  }, [instrumentLedgerDefaults, kind, loadedAccounts]);
  const accountId = defaultAccountId(
    loadedAccounts,
    selectedAccountId,
    kindPreferredAccountId,
  );
  const selectedAccount = useMemo(
    () => loadedAccounts.find((a) => a.id === accountId),
    [loadedAccounts, accountId],
  );
  const formCategoryKind = useMemo((): "expense" | "income" | null => {
    if (kind === "investment") {
      if (investmentPnlMajor == null) return null;
      return investmentPnlMajor >= 0 ? "income" : "expense";
    }
    return expenseCategoryKindForFormKind(kind);
  }, [kind, investmentPnlMajor]);
  const preferredCategoryId = useMemo(() => {
    const fromInstrument = instrumentLedgerPrefill(
      instrumentLedgerDefaults,
      kind === "investment" ? investmentPnlMajor : null,
    ).categoryId;
    if (fromInstrument) return fromInstrument;
    const byKind = preferredCategoryIdForFormKind(kind, loadedCategories);
    if (byKind) {
      const row = loadedCategories.find((c) => c.id === byKind);
      if (formCategoryKind && row && row.kind !== formCategoryKind) {
        return undefined;
      }
      return byKind;
    }
    return kind === "expense"
      ? preferredExpenseCategoryIdForAccountType(
          selectedAccount?.type,
          loadedCategories,
        )
      : undefined;
  }, [
    kind,
    formCategoryKind,
    selectedAccount?.type,
    loadedCategories,
    instrumentLedgerDefaults,
    investmentPnlMajor,
  ]);
  const categorySelection = useMemo(
    () =>
      defaultCategoryPick(
        loadedCategories,
        kind,
        selectedCategoryId,
        categoryEmptyOnOther,
        preferredCategoryId,
        formCategoryKind,
      ),
    [
      loadedCategories,
      kind,
      selectedCategoryId,
      categoryEmptyOnOther,
      preferredCategoryId,
      formCategoryKind,
    ],
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
    !workspaceReady ||
    (status === "authenticated" &&
      (!formLookupsQuery.data ||
        workspaceStateQuery.isLoading ||
        formLookupsQuery.isLoading));
  const lookupSkeletonVisible = initialDashboardPending;

  const visibleCategories = useMemo(() => {
    if (!formCategoryKind) return [];
    return categoriesOfKind(categories, formCategoryKind);
  }, [categories, formCategoryKind]);
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

  useEffect(() => {
    if (kind !== "investment") {
      setInvestmentPnlMinor(null);
      setInvestmentPnlMajor(null);
      setInstrumentLedgerDefaults(null);
      return;
    }
    if (
      selectedCategoryId &&
      !visibleCategories.some((c) => c.id === selectedCategoryId)
    ) {
      setSelectedCategoryId("");
      setCategoryEmptyOnOther(false);
    }
  }, [kind, selectedCategoryId, visibleCategories]);

  useEffect(() => {
    if (kind !== "investment") return;
    const prefillAccountId = instrumentLedgerPrefill(
      instrumentLedgerDefaults,
      null,
    ).accountId;
    if (prefillAccountId) setSelectedAccountId(prefillAccountId);
  }, [instrumentLedgerDefaults, kind]);

  useEffect(() => {
    if (kind !== "investment" || investmentPnlMajor == null) return;
    const categoryId = instrumentLedgerPrefill(
      instrumentLedgerDefaults,
      investmentPnlMajor,
    ).categoryId;
    if (categoryId) {
      setSelectedCategoryId(categoryId);
      setCategoryEmptyOnOther(false);
    }
  }, [instrumentLedgerDefaults, investmentPnlMajor, kind]);

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

  const tagOptionsKey = tagAutocompleteOptions.map((t) => t.name).join("\0");
  const [tagHighlightState, setTagHighlightState] = useState({
    key: tagOptionsKey,
    index: tagAutocompleteOptions.length > 0 ? 0 : -1,
  });
  if (tagHighlightState.key !== tagOptionsKey) {
    setTagHighlightState({
      key: tagOptionsKey,
      index: tagAutocompleteOptions.length > 0 ? 0 : -1,
    });
  }
  const tagSuggestHighlight = tagHighlightState.index;
  const setTagSuggestHighlight = (
    next: number | ((i: number) => number),
  ) => {
    setTagHighlightState((s) => ({
      key: s.key,
      index: typeof next === "function" ? next(s.index) : next,
    }));
  };

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
    isRecurrenceMode ||
    (recurrenceEnabled &&
      kind !== "transfer" &&
      kind !== "loan" &&
      kind !== "investment");
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
        setBootstrapErr(presentClientError("money-transaction-form", e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coreWorkspaceId, refreshWorkspaceCurrency, resolvedWorkspaceId, workspaces]);

  function resetFormFields() {
    setAmountMajor("");
    setNotes("");
    setExcludeFromAnalyticsAndBudget(false);
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
      if (!accountId) throw new Error("Pick an account");
      if (isRecurrenceMode && (kind === "transfer" || kind === "loan" || kind === "investment")) {
        throw new Error("This kind cannot be saved as a recurring template");
      }

      const activityDate = splitDateTimeLocal(occurredAt).date || localDateString();

      if (kind === "investment") {
        const handle = investmentFieldsRef.current;
        if (!handle) throw new Error("Investment form is still loading");
        await handle.save({
          activityDate,
          moneyAccountId: accountId,
          categoryId: categoryId || null,
          notes: notes.trim() || null,
          defaultCurrency,
          amountMinor: null,
        });
        resetFormFields();
        onSuccess?.();
        return;
      }

      if (kind === "loan") {
        if (!loanInstallmentId) throw new Error("Pick a loan installment");
        const minor = parseMajorToMinor(amountMajor, defaultCurrency);
        if (minor == null || minor <= 0) throw new Error("Invalid amount");
        await loansGraphQLRequest(LOAN_INSTALLMENT_PAY_MUTATION, {
          input: {
            scheduleInstallmentId: loanInstallmentId,
            moneyWorkspaceId: activeWorkspaceId,
            accountId,
            categoryId: categoryId || null,
            notes: notes.trim() || null,
            amountMinor: minor,
            occurredAt: occurredAt.trim()
              ? new Date(occurredAt).toISOString()
              : undefined,
          },
        });
        await queryClient.invalidateQueries({ queryKey: loansKeys.all });
        await invalidateMoneyWorkspaceQueries(queryClient);
        notify.success("Payment recorded", "The installment was posted to Money.");
        resetFormFields();
        onSuccess?.();
        return;
      }

      const ledgerKind = kind;

      const minor = parseMajorToMinor(amountMajor, defaultCurrency);
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
        kind: ledgerKind,
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
      if (excludeFromAnalyticsAndBudget) {
        body.excludeFromAnalyticsAndBudget = true;
      }

      if (recurrenceActive) {
        body.recurrence = {
          cadence: recurrenceCadence,
          name: deriveRecurrenceName({
            notes,
            merchantName: selectedMerchantName,
            categoryLabel: selectedCategoryLabel,
            kind: ledgerKind,
          }),
        };
      }

      await moneyGraphQLRequest(MONEY_TRANSACTION_CREATE_MUTATION, {
        input: body,
      });

        await invalidateMoneyWorkspaceQueries(queryClient);
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
        toUserFacingMessage(e, "Something went wrong"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isInvestmentKind = kind === "investment";
  const showInvestmentResult =
    isInvestmentKind && investmentPnlMajor != null;
  const investmentResultTone =
    (investmentPnlMajor ?? 0) >= 0 ? "text-accent" : "text-destructive";
  const isSpecialKind = isInvestmentKind || kind === "loan";

  const submitDisabled =
    submitting ||
    !workspaceReady ||
    needsCurrencySetup ||
    workspaceSyncPending ||
    !accountsReady ||
    accounts.length === 0 ||
    !accountId ||
    (kind === "transfer" && !effectiveToAccountId) ||
    (kind === "loan" && !loanInstallmentId) ||
    (isRecurrenceMode && isSpecialKind) ||
    (isRecurrenceMode && kind === "transfer");

  const cardTitle = isRecurrenceMode
    ? "New recurring transaction"
    : "New transaction";
  const submitLabel = submitting
    ? "Saving…"
    : isRecurrenceMode
      ? "Save recurring transaction"
      : isInvestmentKind
        ? "Save activity"
        : kind === "loan"
          ? "Record payment"
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

      <div>
        <h2 className="sr-only">{cardTitle}</h2>
        <form
          className="grid min-w-0 gap-4"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
          }}
          onSubmit={saveTransaction}
        >
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
                      toUserFacingMessage(err, "Something went wrong"),
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
                <p className="mt-1 text-sm text-muted">Switching workspace…</p>
              ) : null}
            </Field>
          ) : null}

          <fieldset className="grid min-w-0 gap-1.5 text-sm [grid-column:1/-1]">
            <legend className="text-muted">Type</legend>
            <div
              role="radiogroup"
              aria-label="Transaction type"
              className={moneyQuickPickGroupCls}
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
                      if (value === "investment" || value === "loan") {
                        setRecurrenceEnabled(false);
                        const acc = preferredAccountIdForFormKind(
                          value,
                          loadedAccounts,
                        );
                        setSelectedAccountId(acc ?? "");
                        if (value === "loan") {
                          const cat = preferredCategoryIdForFormKind(
                            value,
                            loadedCategories,
                          );
                          setSelectedCategoryId(cat ?? "");
                        } else {
                          setSelectedCategoryId("");
                        }
                        setCategoryEmptyOnOther(false);
                      }
                    }}
                    className={moneyQuickPickChipCls(active)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {kind !== "investment" ? (
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
                autoFocus={kind !== "loan"}
                required
                aria-label="Amount"
              />
              <InputGroupAddon side="trailing" aria-hidden>
                {defaultCurrency}
              </InputGroupAddon>
            </InputGroup>
            {topAmounts.length > 0 && kind !== "loan" ? (
              <>
                <p className="text-sm text-muted">
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
                          "cursor-pointer rounded-[var(--radius-sm)] border border-dashed border-border px-2.5 py-1 text-sm font-medium tabular-nums text-foreground underline decoration-transparent underline-offset-2 transition-[background-color,border-color,color,text-decoration-color] duration-200 hover:border-foreground/25 hover:bg-muted-surface hover:decoration-foreground/40 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring fx-press",
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
          ) : null}

          {kind !== "transfer" && !isInvestmentKind ? (
            lookupSkeletonVisible ? (
              <MoneyLookupQuickPickSkeleton
                legend="Category"
                withPct
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
                otherLabel="Select other category"
                emptyCountsAsOther
                emptySelectedOnOther={categoryOtherSelected}
                emptyMessage={categoryEmptyMessage}
                chipBudgetProgressPct={categoryChipBudgetProgressPct}
              />
            )
          ) : null}

          {lookupSkeletonVisible ? (
            <MoneyLookupQuickPickSkeleton
              legend="Account"
              required
              withPct
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
              searchPlaceholder="Search accounts…"
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
            lookupSkeletonVisible ? (
              <MoneyLookupQuickPickSkeleton
                legend="To Account"
                required
                className="[grid-column:1/-1]"
              />
            ) : !accountsReady ? (
              <fieldset className="grid min-w-0 gap-1.5 text-sm [grid-column:1/-1]">
                <legend className="text-muted">
                  <span className="text-foreground" aria-hidden>
                    *
                  </span>{" "}
                  To Account
                </legend>
                <p className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-muted">
                  Loading accounts...
                </p>
              </fieldset>
            ) : (
              <MoneyUsageQuickPick
                legend="To Account"
                ariaLabel="To Account"
                required
                className="[grid-column:1/-1]"
                items={toAccountOptions.map((a) => ({
                  id: a.id,
                  label: a.name,
                  usageCount: a.usageCount,
                }))}
                selectedId={effectiveToAccountId}
                onSelect={setToAccountId}
                otherLabel="Other account"
                searchPlaceholder="Search accounts…"
                emptyMessage="Add another account to create transfers."
                renderPickerRow={(item) =>
                  formatMinor(
                    accountBalanceById.get(item.id) ?? 0,
                    defaultCurrency,
                  )
                }
              />
            )
          ) : null}

          {isInvestmentKind ? (
            <InvestmentActivityFieldsLazy
              key={instrumentPrefillId ?? "none"}
              saveRef={investmentFieldsRef}
              workspaceReady={lookupsReady}
              initialInstrumentId={instrumentPrefillId}
              defaultCurrency={defaultCurrency}
              onPreviewChange={handleInvestmentPreview}
              onLedgerDefaultsChange={handleInstrumentLedgerDefaults}
            />
          ) : null}

          {isInvestmentKind && investmentPnlMajor != null ? (
            <Field
              className="[grid-column:1/-1]"
              label={
                <span className={investmentResultTone}>
                  {investmentPnlMajor >= 0 ? "Profit" : "Loss"}
                </span>
              }
            >
              <InputGroup>
                <InputGroupAddon side="leading" aria-hidden>
                  {getCurrencySymbol(defaultCurrency)}
                </InputGroupAddon>
                <InputGroupInput
                  value={formatPnlMajorInput(
                    investmentPnlMajor,
                    defaultCurrency,
                  )}
                  readOnly
                  inputMode="decimal"
                  className={investmentResultTone}
                  aria-label={
                    investmentPnlMajor >= 0
                      ? "Profit amount"
                      : "Loss amount"
                  }
                />
                <InputGroupAddon side="trailing" aria-hidden>
                  {defaultCurrency}
                </InputGroupAddon>
              </InputGroup>
            </Field>
          ) : null}

          {showInvestmentResult ? (
            lookupSkeletonVisible ? (
              <MoneyLookupQuickPickSkeleton
                legend="Category"
                withPct
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
                otherLabel="Select other category"
                emptyCountsAsOther
                emptySelectedOnOther={categoryOtherSelected}
                emptyMessage={categoryEmptyMessage}
                chipBudgetProgressPct={categoryChipBudgetProgressPct}
              />
            )
          ) : null}

          {kind === "loan" ? (
            <LoanPaymentFieldsLazy
              workspaceReady={lookupsReady}
              currency={defaultCurrency}
              selectedLoanId={loanId}
              onSelectLoan={handleSelectLoan}
              onPrefillAmount={setAmountMajor}
            />
          ) : null}

          <MoneyDateQuickPick
            legend="Date"
            ariaLabel="Transaction date"
            className="[grid-column:1/-1]"
            value={splitDateTimeLocal(occurredAt).date}
            onChange={(date) => {
              const { time } = splitDateTimeLocal(occurredAt);
              setOccurredAt(joinDateTimeLocal(date, time));
            }}
          />

          {isSpecialKind ? (
            <Field label="Notes" className="[grid-column:1/-1]">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          ) : !showMoreDetails ? (
            <div className="[grid-column:1/-1]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreDetails(true)}
              >
                Notes & extras
              </Button>
            </div>
          ) : (
            <>
          {lookupSkeletonVisible ? (
            <MoneyLookupQuickPickSkeleton
              legend="Merchant"
              chips={2}
              otherChipLabel="Select other merchant"
            />
          ) : (
            <MoneyUsageQuickPick
              legend="Merchant"
              ariaLabel="Merchant"
              items={merchantQuickItems}
              selectedId={merchantId}
              onSelect={setSelectedMerchantId}
              otherLabel="Select other merchant"
              allowEmpty={merchantPickerReady}
              emptyMessage={merchantEmptyMessage}
            />
          )}

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
                                  "relative z-[1] shrink-0 text-sm tabular-nums",
                                  budgetUtilizationPctTextClassName(
                                    fill.progressPct,
                                    { selected },
                                  ),
                                )}
                              >
                                {formatBudgetUtilizationPct(fill.progressPct)}%
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
                  <p className="text-sm text-muted">
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
                            "relative isolate cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border border-dashed border-border px-2.5 py-1 text-sm font-medium text-foreground underline decoration-transparent underline-offset-2 transition-[background-color,border-color,color,text-decoration-color] duration-200 hover:border-foreground/25 hover:bg-muted-surface hover:decoration-foreground/40 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring fx-press",
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

          <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 p-4 [grid-column:1/-1]">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={excludeFromAnalyticsAndBudget}
                onChange={() =>
                  setExcludeFromAnalyticsAndBudget((v) => !v)
                }
                ariaLabel="Exclude from Analytics and budget"
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground">
                  Exclude from Insights and budget
                </span>
                <p className="mt-0.5 text-sm text-muted">
                  Still updates account balance. Hidden from insights charts and
                  budget spend.
                </p>
              </div>
            </div>
          </div>

          {kind !== "transfer" ? (
            <div className="grid min-w-0 gap-3 rounded-[var(--radius-sm)] bg-muted-surface/40 p-4 [grid-column:1/-1]">
              {!isRecurrenceMode ? (
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={recurrenceEnabled}
                    onChange={() => setRecurrenceEnabled((v) => !v)}
                    ariaLabel="Repeat this transaction"
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">
                      Repeat this transaction
                    </span>
                    <p className="mt-0.5 text-sm text-muted">
                      Post this entry now and generate future occurrences on a
                      schedule.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground">
                    Repeat this transaction
                  </span>
                  <p className="mt-0.5 text-sm text-muted">
                    This transaction will repeat on the schedule below.
                  </p>
                </div>
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
            </>
          )}

          <div className="flex flex-wrap items-center gap-3 [grid-column:1/-1]">
            <Button
              type="submit"
              size="sm"
              disabled={submitDisabled}
              aria-busy={submitting}
            >
              {submitLabel}
            </Button>
            <span aria-live="polite" className="text-sm text-muted">
              {kind === "transfer"
                ? "Transfers do not affect totals — only balances."
                : isInvestmentKind
                  ? "Posts profit as income or loss as expense."
                  : kind === "loan"
                    ? "Marks the installment paid and posts an expense."
                : recurrenceActive
                  ? "Creates the first entry and schedules future repeats."
                  : kind === "expense"
                    ? "Reduces account balance."
                    : "Increases account balance."}
            </span>
          </div>
        </form>
      </div>
    </>
  );
}
