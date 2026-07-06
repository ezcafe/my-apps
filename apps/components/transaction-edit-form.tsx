"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  categoriesOfKind,
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
  type MoneyCategoryRow,
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
  MONEY_TRANSACTION_EDIT_QUERY,
  MONEY_TRANSACTION_UPDATE_MUTATION,
} from "@/lib/money-gql-documents";

type Account = {
  id: string;
  name: string;
  currency: string;
  balanceMinor?: number;
  usageCount?: number;
};
type Merchant = { id: string; name: string; usageCount?: number };
type Tag = { id: string; name: string };

type TxPayload = {
  id: string;
  accountId: string;
  kind: "expense" | "income" | "transfer";
  amountMinor: number;
  occurredAt: string;
  categoryId: string | null;
  merchantId: string | null;
  notes: string | null;
  tagIds: string[];
  excludeFromAnalyticsAndBudget: boolean;
};

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
  if (raw === "/money/transactions" || raw === "/money/analytics") {
    return raw;
  }
  return "/money/analytics";
}

function TransactionEditBreadcrumbs({ returnTo }: { returnTo: string }) {
  const itemCls =
    "text-sm font-medium text-muted transition-colors duration-150 hover:text-foreground";
  const currentCls = "text-sm font-medium text-foreground";
  const parentLabel =
    returnTo === "/money/transactions" ? "Transactions" : "Analytics";

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/money" className={itemCls}>
            Money
          </Link>
        </li>
        <li aria-hidden className="text-muted">
          /
        </li>
        <li>
          <Link href={returnTo} className={itemCls}>
            {parentLabel}
          </Link>
        </li>
        <li aria-hidden className="text-muted">
          /
        </li>
        <li className={currentCls} aria-current="page">
          Edit transaction
        </li>
      </ol>
    </nav>
  );
}

export function TransactionEditForm({
  transactionId,
  returnTo: returnToProp,
}: {
  transactionId: string;
  returnTo?: string | null;
}) {
  const router = useRouter();
  const returnTo = resolveTransactionEditReturnTo(returnToProp ?? null);
  const { defaultCurrency } = useWorkspaceCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<MoneyCategoryRow[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [loaded, setLoaded] = useState<TxPayload | null>(null);
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const visibleCategories = useMemo(
    () => (kind === "transfer" ? [] : categoriesOfKind(categories, kind)),
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await moneyGraphQLRequest<{
          moneyAccounts: Account[];
          moneyCategories: MoneyCategoryRow[];
          moneyMerchants: Merchant[];
          moneyTags: Tag[];
          moneyTransaction: TxPayload | null;
        }>(MONEY_TRANSACTION_EDIT_QUERY, { id: transactionId });
        if (cancelled) return;
        setAccounts(res.moneyAccounts);
        setCategories(res.moneyCategories);
        setMerchants(res.moneyMerchants);
        setTags(res.moneyTags);
        const tx = res.moneyTransaction;
        if (!tx) {
          setErr("Transaction not found");
          setLoaded(null);
          return;
        }
        setLoaded(tx);
        setAccountId(tx.accountId);
        setKind(tx.kind);
        setAmountMajor(minorToMajorInput(tx.amountMinor, defaultCurrency));
        setOccurredAt(isoToDatetimeLocal(tx.occurredAt));
        setCategoryId(tx.categoryId ?? "");
        setCategoryEmptyOnOther(!tx.categoryId);
        setMerchantId(tx.merchantId ?? "");
        setNotes(tx.notes ?? "");
        setExcludeFromAnalyticsAndBudget(tx.excludeFromAnalyticsAndBudget);
        setSelectedTagIds([...tx.tagIds]);
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Error");
          setLoaded(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transactionId, defaultCurrency]);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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
      router.push(returnTo);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
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
      router.push(returnTo);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setDeleting(false);
    }
  }

  const dateTimeLocalCls =
    "[&::-webkit-datetime-edit]:font-sans [&::-webkit-datetime-edit-fields-wrapper]:font-sans";

  if (loading) {
    return (
      <div className="min-w-0 max-w-4xl space-y-6">
        <TransactionEditBreadcrumbs returnTo={returnTo} />
        <Card className="p-5">
          <div className="grid gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (!loaded && err) {
    return (
      <div className="flex min-w-0 max-w-4xl flex-col gap-3">
        <TransactionEditBreadcrumbs returnTo={returnTo} />
        <Alert variant="error" title="Couldn’t load transaction" description={err} />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-4xl space-y-6">
      <TransactionEditBreadcrumbs returnTo={returnTo} />
      {err ? <Alert variant="error" title={err} /> : null}
      <Card className="p-5">
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
                      {a.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
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
              otherLabel="Other category"
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
            otherLabel="Other merchant"
            allowEmpty
            emptyMessage="No merchants yet. Add one in Settings."
          />

          <Field label="When">
            <Input
              type="datetime-local"
              className={dateTimeLocalCls}
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </Field>

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
              size="lg"
              disabled={
                accounts.length === 0 || !accountId || saving || deleting
              }
              aria-busy={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="lg"
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
      </Card>
    </div>
  );
}
