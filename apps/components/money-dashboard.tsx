"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { formatMinor, parseMajorToMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_BOOTSTRAP_QUERY,
  MONEY_SET_ACTIVE_WORKSPACE_MUTATION,
  MONEY_TRANSACTION_CREATE_MUTATION,
} from "@/lib/money-gql-documents";
import {
  categoriesOfKind,
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";

type Account = {
  id: string;
  name: string;
  currency: string;
  type: string;
  balanceMinor: number;
};
type Category = MoneyCategoryRow;
type Merchant = { id: string; name: string };

type WorkspaceRow = {
  id: string;
  name: string;
  kind: "personal" | "shared";
  ownedByUserSub: string | null;
  defaultCurrency: string | null;
  role: "owner" | "member";
  isDefault: boolean;
};

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

export function MoneyDashboard() {
  const { data: session } = useSession();
  const userSub = session?.user?.id;
  const notify = useNotify();
  const { formatDate } = useFormatDate();
  const { defaultCurrency, refreshWorkspaceCurrency } = useWorkspaceCurrency();

  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [kind, setKind] = useState<KindValue>("expense");
  const [amountMajor, setAmountMajor] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    dateToOccurredAt(localDateString()),
  );
  const [whenMode, setWhenMode] = useState<WhenMode>("today");
  const [customDate, setCustomDate] = useState<string>("");
  const customDateInputRef = useRef<HTMLInputElement>(null);
  const [categoryId, setCategoryId] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("No category");
  const [categoryFilterQuery, setCategoryFilterQuery] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

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
            label: child.name,
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
  const selectedCategoryLabel = useMemo(
    () => categoryOptions.find((option) => option.id === categoryId)?.label ?? "",
    [categoryOptions, categoryId],
  );
  const filteredCategoryOptions = useMemo(() => {
    const query = categoryFilterQuery.trim().toLowerCase();
    const flat = categoryGroups.flatMap((group) => group.options);
    if (!query) return flat;
    return flat.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [categoryGroups, categoryFilterQuery]);
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

  const fetchBootstrapAndSync = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyBootstrap: MoneyWorkspaceBootstrapData }>(
      MONEY_BOOTSTRAP_QUERY,
    );
    const boot = res.moneyBootstrap;
    setWorkspaces(boot.workspaces);

    let resolvedId = boot.workspaceId;
    if (!boot.workspaces.some((w) => w.id === resolvedId)) {
      resolvedId =
        boot.workspaces.find((w) => w.isDefault)?.id ??
        boot.workspaces[0]?.id ??
        resolvedId;
    }

    setActiveWorkspaceId(resolvedId);

    let ledgerBoot = boot;
    if (
      resolvedId &&
      resolvedId !== boot.workspaceId &&
      boot.workspaces.some((w) => w.id === resolvedId)
    ) {
      await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
        workspaceId: resolvedId,
      });
      await refreshWorkspaceCurrency();
      const res2 = await moneyGraphQLRequest<{ moneyBootstrap: MoneyWorkspaceBootstrapData }>(
        MONEY_BOOTSTRAP_QUERY,
      );
      ledgerBoot = res2.moneyBootstrap;
    }

    setAccounts(ledgerBoot.accounts);
    setAccountId((prev) => {
      const data = ledgerBoot.accounts;
      if (data.length === 0) return "";
      const ok = data.some((a) => a.id === prev);
      if (ok) return prev;
      const firstCredit = data.find((a) => a.type === "credit");
      return firstCredit?.id ?? data[0].id;
    });
    setCategories(ledgerBoot.categories);
    setMerchants(ledgerBoot.merchants);
  }, [refreshWorkspaceCurrency]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          if (cancelled) return;
          await fetchBootstrapAndSync();
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(e instanceof Error ? e.message : "Error");
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchBootstrapAndSync]);

  const [prevSelectedCategoryLabel, setPrevSelectedCategoryLabel] = useState(
    selectedCategoryLabel,
  );
  if (selectedCategoryLabel !== prevSelectedCategoryLabel) {
    // React docs pattern for resetting state when a derived value changes:
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    setPrevSelectedCategoryLabel(selectedCategoryLabel);
    setCategoryQuery(selectedCategoryLabel);
    setCategoryFilterQuery("");
  }

  const [prevKind, setPrevKind] = useState(kind);
  if (kind !== prevKind) {
    setPrevKind(kind);
    if (categoryId && !visibleCategories.some((c) => c.id === categoryId)) {
      setCategoryId("");
      setCategoryQuery("No category");
      setCategoryFilterQuery("");
    }
  }

  async function saveTransaction(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
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
    accounts.length === 0 ||
    !accountId ||
    (kind === "transfer" && !effectiveToAccountId);

  return (
    <div className="min-w-0 max-w-4xl space-y-6 fx-fade-in">
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
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
                disabled={workspaces.length === 0}
                onChange={async (e) => {
                  const next = e.target.value;
                  if (!next || next === activeWorkspaceId) return;
                  try {
                    await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
                      workspaceId: next,
                    });
                    setActiveWorkspaceId(next);
                    await refreshWorkspaceCurrency();
                    await fetchBootstrapAndSync();
                    notify.success(
                      "Workspace switched",
                      "Ledger data was refreshed.",
                    );
                  } catch (err: unknown) {
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
            </Field>
          ) : null}

          <Field label="Amount" required>
            <Input
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
              inputMode="decimal"
              placeholder={defaultCurrency === "VND" ? "25" : "24.99"}
              autoFocus
              required
            />
          </Field>

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

          <fieldset className="grid min-w-0 gap-2 text-sm [grid-column:1/-1]">
            <legend className="text-muted">
              <span className="text-foreground" aria-hidden>
                *
              </span>{" "}
              Account
            </legend>
            {accounts.length === 0 ? (
              <p className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-muted">
                No accounts yet. Add one in Settings.
              </p>
            ) : (
              <div
                className="grid min-w-0 gap-2"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
                }}
              >
                {accounts.map((a) => (
                  <label key={a.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="account-id"
                      value={a.id}
                      checked={accountId === a.id}
                      onChange={() => setAccountId(a.id)}
                      className="peer sr-only"
                      required
                    />
                    <span className="flex min-h-14 flex-col rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-left transition-[border-color,box-shadow,transform] duration-200 hover:border-foreground/40 peer-checked:border-foreground peer-checked:bg-muted-surface peer-checked:shadow-[var(--shadow-sm)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring fx-press">
                      <span className="text-sm font-medium text-foreground">
                        {a.name}
                      </span>
                      <span className="text-xs text-muted">
                        {formatMinor(a.balanceMinor, defaultCurrency)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {kind === "transfer" ? (
            <Field label="To Account" required className="[grid-column:1/-1]">
              {toAccountOptions.length === 0 ? (
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
            <Field label="Category" className="relative [grid-column:1/-1]">
              <div className="relative">
                <Input
                  type="text"
                  value={categoryQuery}
                  onFocus={() => {
                    setCategoryFilterQuery("");
                    setCategoryMenuOpen(true);
                  }}
                  onChange={(e) => {
                    const nextQuery = e.target.value;
                    setCategoryQuery(nextQuery);
                    setCategoryFilterQuery(nextQuery);
                    setCategoryMenuOpen(true);
                  }}
                  onBlur={() => {
                    queueMicrotask(() => {
                      setCategoryMenuOpen(false);
                      setCategoryQuery(selectedCategoryLabel);
                      setCategoryFilterQuery("");
                    });
                  }}
                  placeholder="Search category"
                  role="combobox"
                  aria-expanded={categoryMenuOpen}
                  aria-controls="category-combobox-options"
                  aria-autocomplete="list"
                />
                {categoryMenuOpen ? (
                  <ul
                    id="category-combobox-options"
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[var(--radius-md)] border border-border bg-surface p-1 shadow-[var(--shadow-md)] fx-fade-in"
                  >
                    {filteredCategoryOptions.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-muted">
                        No matches
                      </li>
                    ) : (
                      filteredCategoryOptions.map((option) => (
                        <li
                          key={option.id === "" ? "none" : option.id}
                          role="option"
                          aria-selected={categoryId === option.id}
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCategoryId(option.id);
                              setCategoryQuery(option.label);
                              setCategoryFilterQuery("");
                              setCategoryMenuOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center rounded-[var(--radius-sm)] py-2 pr-3 text-left text-sm transition-colors duration-150",
                              option.isChild ? "pl-8" : "pl-3",
                              categoryId === option.id
                                ? "bg-accent text-accent-foreground"
                                : "text-foreground hover:bg-muted-surface",
                            )}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </div>
            </Field>
          ) : null}

          <Field label="Merchant">
            <Select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
            >
              <option value="">—</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>

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
