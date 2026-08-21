"use client";

import { presentClientError, queryErrorMessage } from "@/lib/user-facing-error";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import {
  joinDateTimeLocal,
  MoneyDateQuickPick,
  splitDateTimeLocal,
} from "@/components/money-date-quick-pick";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  categoriesOfKind,
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
} from "@/lib/money-category-ui";
import {
  formatMinor,
  getCurrencySymbol,
  minorToMajorInput,
  parseMajorToMinor,
} from "@/lib/format-money";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_TRANSACTION_DELETE_MUTATION,
  MONEY_TRANSACTION_UPDATE_MUTATION,
} from "@/lib/money-gql-documents";
import {
  findCachedMoneyTransaction,
  moneyFormLookupsQueryOptions,
  moneyRootQueryKey,
  moneyTransactionQueryOptions,
  type MoneyTransactionDetail,
} from "@/lib/money-query-options";

type TxPayload = MoneyTransactionDetail;

const KIND_OPTIONS = [
  { value: "expense", label: "Expense", description: "Money out" },
  { value: "income", label: "Income", description: "Money in" },
  { value: "transfer", label: "Transfer", description: "Between accounts" },
] as const;

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function resolveTransactionEditReturnTo(raw: string | null): string {
  if (
    raw === "/money/spending" ||
    raw === "/money/transactions" ||
    raw === "/money/bills" ||
    raw === "/money/savings" ||
    raw === "/money/investments" ||
    raw === "/money/loans" ||
    raw === "/money/analytics"
  ) {
    return raw === "/money/transactions" ? "/money/spending" : raw;
  }
  return "/money/spending";
}

export function TransactionEditForm({
  transactionId,
  returnTo: returnToProp,
  variant = "page",
  onClose,
  onSaved,
}: {
  transactionId: string;
  returnTo?: string | null;
  variant?: "page" | "modal";
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const returnTo = resolveTransactionEditReturnTo(returnToProp ?? null);
  const isModal = variant === "modal";
  const { defaultCurrency, workspaceId, workspaceReady } = useWorkspaceCurrency();
  const workspaceKey = workspaceId ?? "";
  const canRunMoneyQueries =
    workspaceReady && workspaceKey !== "" && typeof window !== "undefined";

  const formLookupsQuery = useQuery({
    ...moneyFormLookupsQueryOptions(),
    enabled: canRunMoneyQueries,
  });
  const transactionQuery = useQuery({
    ...moneyTransactionQueryOptions(workspaceKey, transactionId),
    enabled: canRunMoneyQueries,
    placeholderData: () =>
      findCachedMoneyTransaction(queryClient, workspaceKey, transactionId) ??
      undefined,
  });

  const accounts = useMemo(
    () => formLookupsQuery.data?.moneyAccounts ?? [],
    [formLookupsQuery.data?.moneyAccounts],
  );
  const categories = useMemo(
    () => formLookupsQuery.data?.moneyCategories ?? [],
    [formLookupsQuery.data?.moneyCategories],
  );
  const merchants = useMemo(
    () => formLookupsQuery.data?.moneyMerchants ?? [],
    [formLookupsQuery.data?.moneyMerchants],
  );
  const tags = useMemo(
    () => formLookupsQuery.data?.moneyTags ?? [],
    [formLookupsQuery.data?.moneyTags],
  );

  const loaded =
    transactionQuery.data && transactionQuery.data.id === transactionId
      ? transactionQuery.data
      : null;

  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [kind, setKind] = useState<TxPayload["kind"]>("expense");
  const [amountMajor, setAmountMajor] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryEmptyOnOther, setCategoryEmptyOnOther] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [notes, setNotes] = useState("");
  const [excludeFromAnalyticsAndBudget, setExcludeFromAnalyticsAndBudget] =
    useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const transactionReady =
    transactionQuery.isSuccess ||
    (!!transactionQuery.data && transactionQuery.data.id === transactionId);
  const loading =
    !canRunMoneyQueries ||
    (formLookupsQuery.isPending && !formLookupsQuery.data) ||
    (!transactionReady && transactionQuery.isPending);
  const loadError =
    queryErrorMessage(formLookupsQuery.error) ??
    queryErrorMessage(transactionQuery.error) ??
    (transactionQuery.isSuccess && transactionQuery.data == null
      ? "Transaction not found"
      : null);

  if (transactionId !== hydratedId && loaded?.id === transactionId) {
    setHydratedId(loaded.id);
    setErr(null);
    setAccountId(loaded.accountId);
    setKind(loaded.kind);
    setAmountMajor(minorToMajorInput(loaded.amountMinor, defaultCurrency));
    setOccurredAt(isoToDatetimeLocal(loaded.occurredAt));
    setCategoryId(loaded.categoryId ?? "");
    setCategoryEmptyOnOther(!loaded.categoryId);
    setMerchantId(loaded.merchantId ?? "");
    setNotes(loaded.notes ?? "");
    setExcludeFromAnalyticsAndBudget(loaded.excludeFromAnalyticsAndBudget);
    setSelectedTagIds([...loaded.tagIds]);
    setToAccountId("");
  } else if (transactionId !== hydratedId && !loaded) {
    setHydratedId(null);
  }

  const visibleCategories = useMemo(
    () =>
      kind === "transfer"
        ? []
        : categoriesOfKind(categories, kind),
    [categories, kind],
  );
  const categoryById = useMemo(
    () => moneyCategoryById(visibleCategories),
    [visibleCategories],
  );
  const categorySelectGroups = useMemo(
    () => moneyCategorySelectGroups(visibleCategories),
    [visibleCategories],
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
    () => new Map(accounts.map((a) => [a.id, a.balanceMinor ?? 0] as const)),
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
  const categoryPickerItems = useMemo(() => {
    const none = { id: "", label: "No category", isChild: false as const };
    const fromGroups = categorySelectGroups.flatMap((g) =>
      g.type === "single"
        ? [
            {
              id: g.category.id,
              label: moneyCategoryLabel(g.category, categoryById),
              isChild: false as const,
            },
          ]
        : [
            {
              id: g.parent.id,
              label: `${g.parent.name} (all)`,
              isChild: false as const,
            },
            ...g.children.map((c) => ({
              id: c.id,
              label: moneyCategoryLabel(c, categoryById),
              isChild: true as const,
            })),
          ],
    );
    return [none, ...fromGroups];
  }, [categorySelectGroups, categoryById]);
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

  const [prevKind, setPrevKind] = useState(kind);
  if (kind !== prevKind) {
    setPrevKind(kind);
    if (categoryId && !visibleCategories.some((c) => c.id === categoryId)) {
      setCategoryId("");
      setCategoryEmptyOnOther(false);
    }
  }

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const finishSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: moneyRootQueryKey });
    onSaved?.();
    if (isModal) {
      onClose?.();
    } else {
      router.push(returnTo);
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const minor = parseMajorToMinor(amountMajor, defaultCurrency);
    if (!accountId) {
      setErr("Pick an account");
      return;
    }
    if (minor == null || minor <= 0) {
      setErr("Invalid amount");
      return;
    }
    if (kind === "transfer" && !effectiveToAccountId) {
      setErr("Pick a destination account");
      return;
    }
    if (kind === "transfer" && effectiveToAccountId === accountId) {
      setErr("From and destination accounts must be different");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        accountId,
        kind,
        amountMinor: minor,
        occurredAt: new Date(occurredAt).toISOString(),
        toAccountId: kind === "transfer" ? effectiveToAccountId : null,
        categoryId: kind === "transfer" ? null : categoryId || null,
        merchantId: kind === "transfer" ? null : merchantId || null,
        notes: notes.trim() ? notes.trim() : null,
        tagIds: selectedTagIds,
        excludeFromAnalyticsAndBudget,
      };
      await moneyGraphQLRequest(MONEY_TRANSACTION_UPDATE_MUTATION, {
        id: transactionId,
        input: payload,
      });
      await finishSuccess();
    } catch (e: unknown) {
      setErr(presentClientError("transaction-edit-form", e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this transaction? This cannot be undone.",
      )
    ) {
      return;
    }
    setErr(null);
    setDeleting(true);
    try {
      await moneyGraphQLRequest(MONEY_TRANSACTION_DELETE_MUTATION, {
        id: transactionId,
      });
      await finishSuccess();
    } catch (e: unknown) {
      setErr(presentClientError("transaction-edit-form", e));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className={isModal ? "space-y-4" : "min-w-0 max-w-4xl space-y-4"}>
        <div>
          <header className="mb-4 flex items-baseline justify-between gap-3">
            <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-3 w-10 rounded-[var(--radius-sm)]" />
          </header>
          <div
            className="grid min-w-0 gap-4"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
            }}
          >
            <div className="[grid-column:1/-1] space-y-1.5">
              <Skeleton className="h-3 w-12 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full max-w-xs rounded-[var(--radius-md)]" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
            <div className="[grid-column:1/-1] space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
            <div className="[grid-column:1/-1] space-y-1.5">
              <Skeleton className="h-3 w-20 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
            <Skeleton className="h-20 w-full rounded-[var(--radius-md)] [grid-column:1/-1]" />
            <div className="flex flex-wrap gap-2 [grid-column:1/-1]">
              <Skeleton className="h-11 w-36 rounded-[var(--radius-md)]" />
              <Skeleton className="h-11 w-24 rounded-[var(--radius-md)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!loaded && loadError) {
    return (
      <div
        className={
          isModal
            ? "flex flex-col gap-3"
            : "flex min-w-0 max-w-4xl flex-col gap-3"
        }
      >
        <Alert
          variant="error"
          title="Couldn’t load transaction"
          description={loadError}
        />
      </div>
    );
  }

  if (!loaded) {
    return null;
  }

  return (
    <div className={isModal ? "space-y-4" : "min-w-0 max-w-4xl space-y-6"}>
      {err ? <Alert variant="error" title={err} /> : null}
      <div>
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-medium tracking-tight">
            Edit transaction
          </h2>
          <span className="text-xs text-muted">{defaultCurrency}</span>
        </header>
        <form
          className="grid min-w-0 gap-4"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
          }}
          onSubmit={onSubmit}
        >
          <fieldset className="grid min-w-0 gap-1.5 text-sm [grid-column:1/-1]">
            <legend className="text-muted">Kind</legend>
            <div
              role="radiogroup"
              aria-label="Transaction kind"
              className="inline-flex min-w-0 flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1"
            >
              {KIND_OPTIONS.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={kind === value}
                  title={description}
                  onClick={() => {
                    setKind(value);
                    if (value !== "transfer") setToAccountId("");
                  }}
                  className={cn(
                    "min-w-20 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
                    kind === value
                      ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                      : "text-muted hover:bg-muted-surface hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

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
                required
                aria-label="Amount"
              />
              <InputGroupAddon side="trailing" aria-hidden>
                {defaultCurrency}
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <MoneyUsageQuickPick
            legend="Account"
            ariaLabel="Account"
            required
            className="[grid-column:1/-1]"
            items={accountQuickItems}
            selectedId={accountId}
            onSelect={setAccountId}
            otherLabel="Other account"
            emptyMessage="No accounts yet. Add one in Settings."
            renderPickerRow={(item) =>
              formatMinor(
                accountBalanceById.get(item.id) ?? 0,
                defaultCurrency,
              )
            }
          />

          {kind === "transfer" ? (
            toAccountOptions.length === 0 ? (
              <fieldset className="grid min-w-0 gap-1.5 text-sm [grid-column:1/-1]">
                <legend className="text-muted">
                  <span className="text-foreground" aria-hidden>
                    *
                  </span>{" "}
                  To Account
                </legend>
                <p className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-muted">
                  Add another account to create transfers.
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
                emptyMessage="Add another account to create transfers."
              />
            )
          ) : (
            <MoneyUsageQuickPick
              legend="Category"
              ariaLabel="Category"
              className="[grid-column:1/-1]"
              items={categoryQuickItems}
              pickerItems={categoryPickerItems}
              selectedId={categoryId}
              onSelect={(id) => {
                setCategoryId(id);
                setCategoryEmptyOnOther(id === "");
              }}
              otherLabel="Select other category"
              emptyCountsAsOther
              emptySelectedOnOther={categoryEmptyOnOther}
              emptyMessage="No categories yet. Add one in Settings."
            />
          )}

          <MoneyUsageQuickPick
            legend="Merchant"
            ariaLabel="Merchant"
            items={merchantQuickItems}
            selectedId={merchantId}
            onSelect={setMerchantId}
            otherLabel="Select other merchant"
            allowEmpty
            emptyMessage="No merchants yet. Add one in Settings."
          />

          <MoneyDateQuickPick
            legend="When"
            ariaLabel="Transaction date"
            className="[grid-column:1/-1]"
            value={splitDateTimeLocal(occurredAt).date}
            onChange={(date) => {
              const { time } = splitDateTimeLocal(occurredAt);
              setOccurredAt(joinDateTimeLocal(date, time));
            }}
          />

          <fieldset className="grid min-w-0 gap-2 text-sm [grid-column:1/-1]">
            <legend className="text-muted">Tags</legend>
            {tags.length === 0 ? (
              <p className="text-xs text-muted">No tags in workspace.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const checked = selectedTagIds.includes(t.id);
                  return (
                    <li key={t.id}>
                      <label className="cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTag(t.id)}
                          className="peer sr-only"
                        />
                        <span
                          className={cn(
                            "inline-flex items-center rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,box-shadow] duration-150 fx-press",
                            checked
                              ? "border-accent bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent"
                              : "border-border bg-background text-foreground hover:border-foreground/40",
                          )}
                        >
                          {t.name}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          <Field label="Notes" className="[grid-column:1/-1]">
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <div className="rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 [grid-column:1/-1]">
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
                  Exclude from Analytics and budget
                </span>
                <p className="mt-0.5 text-xs text-muted">
                  Still updates account balance. Hidden from analytics charts and
                  budget spend.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 [grid-column:1/-1]">
            <Button
              type="submit"
              size="sm"
              disabled={
                accounts.length === 0 || !accountId || saving || deleting
              }
              aria-busy={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {isModal ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving || deleting}
                onClick={onClose}
              >
                Cancel
              </Button>
            ) : (
              <Link
                href={returnTo}
                className="text-sm font-medium text-muted underline-offset-2 transition-colors duration-150 hover:text-foreground hover:underline"
              >
                Cancel
              </Link>
            )}
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={saving || deleting}
              aria-busy={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
            <span aria-live="polite" className="text-xs text-muted">
              Changes update balances and analytics immediately.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
