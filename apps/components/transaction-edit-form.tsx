"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { minorToMajorInput, parseMajorToMinor } from "@/lib/format-money";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_TRANSACTION_DELETE_MUTATION,
  MONEY_TRANSACTION_EDIT_QUERY,
  MONEY_TRANSACTION_UPDATE_MUTATION,
} from "@/lib/money-gql-documents";

type Account = { id: string; name: string; currency: string };
type Merchant = { id: string; name: string };
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

function TransactionEditBreadcrumbs() {
  const itemCls =
    "text-sm font-medium text-muted transition-colors duration-150 hover:text-foreground";
  const currentCls = "text-sm font-medium text-foreground";

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
          <Link href="/money/analytics" className={itemCls}>
            Analytics
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

export function TransactionEditForm({ transactionId }: { transactionId: string }) {
  const router = useRouter();
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
  const [merchantId, setMerchantId] = useState("");
  const [notes, setNotes] = useState("");
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
        setMerchantId(tx.merchantId ?? "");
        setNotes(tx.notes ?? "");
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
      await moneyGraphQLRequest(MONEY_TRANSACTION_UPDATE_MUTATION, {
        id: transactionId,
        input: {
          accountId,
          kind,
          amountMinor: minor,
          occurredAt: new Date(occurredAt).toISOString(),
          toAccountId: kind === "transfer" ? effectiveToAccountId : null,
          categoryId: kind === "transfer" ? null : categoryId || null,
          merchantId: kind === "transfer" ? null : merchantId || null,
          notes: notes.trim() ? notes.trim() : null,
          tagIds: selectedTagIds,
        },
      });
      router.push("/money/analytics");
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
      router.push("/money/analytics");
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
        <TransactionEditBreadcrumbs />
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
      <div className="flex min-w-0 max-w-4xl flex-col gap-3 fx-fade-in">
        <TransactionEditBreadcrumbs />
        <Alert variant="error" title="Couldn’t load transaction" description={err} />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-4xl space-y-6 fx-fade-in">
      <TransactionEditBreadcrumbs />
      {err ? <Alert variant="error" title={err} /> : null}
      <Card className="p-5">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h1 className="font-display text-lg font-medium tracking-tight">
            Edit transaction
          </h1>
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
          <fieldset className="grid min-w-0 gap-2 text-sm [grid-column:1/-1]">
            <legend className="text-muted">Kind</legend>
            <div
              className="grid min-w-0 gap-2"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))",
              }}
            >
              {KIND_OPTIONS.map(({ value, label, description }) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="transaction-kind"
                    value={value}
                    checked={kind === value}
                    onChange={() => {
                      setKind(value);
                      if (value !== "transfer") setToAccountId("");
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-14 flex-col rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-left transition-[border-color,box-shadow,transform] duration-200 hover:border-foreground/40 peer-checked:border-foreground peer-checked:bg-muted-surface peer-checked:shadow-[var(--shadow-sm)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring fx-press">
                    <span className="text-sm font-medium text-foreground">
                      {label}
                    </span>
                    <span className="text-xs text-muted">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Amount" required>
            <Input
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
              inputMode="decimal"
              placeholder={defaultCurrency === "VND" ? "25" : "24.99"}
              required
            />
          </Field>

          <Field label="When">
            <Input
              type="datetime-local"
              className={dateTimeLocalCls}
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </Field>

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
                      name="edit-account-id"
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
                        {defaultCurrency}
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
                      {a.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <fieldset className="grid min-w-0 gap-2 text-sm [grid-column:1/-1]">
              <legend className="text-muted">Category</legend>
              <div
                className="grid min-w-0 gap-2"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
                }}
              >
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="edit-category-id"
                    value=""
                    checked={categoryId === ""}
                    onChange={() => setCategoryId("")}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-14 items-center rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] duration-200 hover:border-foreground/40 peer-checked:border-foreground peer-checked:bg-muted-surface peer-checked:shadow-[var(--shadow-sm)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring fx-press">
                    No category
                  </span>
                </label>
                {categorySelectGroups.flatMap((g) =>
                  g.type === "single"
                    ? [
                        <label key={g.category.id} className="cursor-pointer">
                          <input
                            type="radio"
                            name="edit-category-id"
                            value={g.category.id}
                            checked={categoryId === g.category.id}
                            onChange={() => setCategoryId(g.category.id)}
                            className="peer sr-only"
                          />
                          <span className="flex min-h-14 items-center rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] duration-200 hover:border-foreground/40 peer-checked:border-foreground peer-checked:bg-muted-surface peer-checked:shadow-[var(--shadow-sm)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring fx-press">
                            {moneyCategoryLabel(g.category, categoryById)}
                          </span>
                        </label>,
                      ]
                    : [
                        <label key={g.parent.id} className="cursor-pointer">
                          <input
                            type="radio"
                            name="edit-category-id"
                            value={g.parent.id}
                            checked={categoryId === g.parent.id}
                            onChange={() => setCategoryId(g.parent.id)}
                            className="peer sr-only"
                          />
                          <span className="flex min-h-14 items-center rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] duration-200 hover:border-foreground/40 peer-checked:border-foreground peer-checked:bg-muted-surface peer-checked:shadow-[var(--shadow-sm)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring fx-press">
                            {g.parent.name}
                          </span>
                        </label>,
                        ...g.children.map((c) => (
                          <label key={c.id} className="cursor-pointer">
                            <input
                              type="radio"
                              name="edit-category-id"
                              value={c.id}
                              checked={categoryId === c.id}
                              onChange={() => setCategoryId(c.id)}
                              className="peer sr-only"
                            />
                            <span className="flex min-h-14 items-center rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] duration-200 hover:border-foreground/40 peer-checked:border-foreground peer-checked:bg-muted-surface peer-checked:shadow-[var(--shadow-sm)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring fx-press">
                              {c.name}
                            </span>
                          </label>
                        )),
                      ],
                )}
              </div>
            </fieldset>
          )}

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

          <div className="flex flex-wrap gap-2 [grid-column:1/-1]">
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
          </div>
        </form>
      </Card>
    </div>
  );
}
