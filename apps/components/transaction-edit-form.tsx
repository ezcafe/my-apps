"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspaceCurrency } from "@/components/workspace-gate";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import { minorToMajorInput, parseMajorToMinor } from "@/lib/format-money";
import { Alert } from "@/components/ui/alert";
import { moneyApiJson } from "@/lib/money-fetch";

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

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TransactionEditBreadcrumbs() {
  const itemClass = "text-sm font-medium text-muted hover:text-foreground";
  const currentClass = "text-sm font-medium text-foreground";

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/money" className={itemClass}>
            Money
          </Link>
        </li>
        <li aria-hidden className="text-muted">
          /
        </li>
        <li>
          <Link href="/money/analytics" className={itemClass}>
            Analytics
          </Link>
        </li>
        <li aria-hidden className="text-muted">
          /
        </li>
        <li className={currentClass} aria-current="page">
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
  const [kind, setKind] = useState<"expense" | "income" | "transfer">("expense");
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

  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);
  const categorySelectGroups = useMemo(
    () => moneyCategorySelectGroups(categories),
    [categories],
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

  const loadLookups = useCallback(async () => {
    const [accRes, catRes, merRes, tagRes] = await Promise.all([
      moneyApiJson<Account[]>("/api/money/accounts"),
      moneyApiJson<MoneyCategoryRow[]>("/api/money/categories"),
      moneyApiJson<Merchant[]>("/api/money/merchants"),
      moneyApiJson<Tag[]>("/api/money/tags"),
    ]);
    setAccounts(accRes.data);
    setCategories(catRes.data);
    setMerchants(merRes.data);
    setTags(tagRes.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        await loadLookups();
        if (cancelled) return;
        const { data: tx } = await moneyApiJson<TxPayload>(
          `/api/money/transactions/${transactionId}`,
        );
        if (cancelled) return;
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
  }, [transactionId, loadLookups, defaultCurrency]);

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
      await moneyApiJson(`/api/money/transactions/${transactionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          accountId,
          kind,
          amountMinor: minor,
          occurredAt: new Date(occurredAt).toISOString(),
          toAccountId: kind === "transfer" ? effectiveToAccountId : null,
          categoryId: kind === "transfer" ? null : categoryId || null,
          merchantId: kind === "transfer" ? null : merchantId || null,
          notes: notes.trim() ? notes.trim() : null,
          tagIds: selectedTagIds,
        }),
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
      await moneyApiJson<{ ok: boolean }>(
        `/api/money/transactions/${transactionId}`,
        { method: "DELETE" },
      );
      router.push("/money/analytics");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setDeleting(false);
    }
  }

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-sm font-sans font-normal leading-normal tracking-normal text-foreground antialiased w-full min-w-0";
  const dateTimeLocalCls = `${inputCls} [&::-webkit-datetime-edit]:font-sans [&::-webkit-datetime-edit-fields-wrapper]:font-sans`;

  if (loading) {
    return (
      <p className="text-sm text-muted">Loading transaction…</p>
    );
  }

  if (!loaded && err) {
    return (
      <div className="flex flex-col gap-3">
        <TransactionEditBreadcrumbs />
        <Alert variant="error" title="Couldn’t load transaction" description={err} />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-4xl space-y-6">
      <TransactionEditBreadcrumbs />
      {err ? (
        <Alert variant="error" title={err} />
      ) : null}
      <section className="rounded-md border border-border bg-surface p-4">
        <form className="mt-4 grid grid-cols-1 gap-3" onSubmit={onSubmit}>
          <fieldset className="grid min-w-0 gap-1 text-sm">
            <legend className="text-muted">Kind</legend>
            <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">
              {(
                [
                  ["expense", "Expense", "Money out"],
                  ["income", "Income", "Money in"],
                  ["transfer", "Transfer", "Between accounts"],
                ] as const
              ).map(([value, label, description]) => (
                <label key={value} className="min-w-32 cursor-pointer">
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
                  <span className="flex min-h-14 flex-col rounded-md border border-border bg-background px-3 py-2 text-left transition peer-checked:border-foreground peer-checked:ring-1 peer-checked:ring-foreground">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">
              <span className="text-foreground" aria-hidden>
                *
              </span>{" "}
              Amount
            </span>
            <input
              className={inputCls}
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
              placeholder={defaultCurrency === "VND" ? "25" : "24.99"}
              required
            />
          </label>
          <fieldset className="grid min-w-0 gap-1 text-sm">
            <legend className="text-muted">
              <span className="text-foreground" aria-hidden>
                *
              </span>{" "}
              Account
            </legend>
            {accounts.length === 0 ? (
              <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
                No accounts yet. Add one in Settings.
              </p>
            ) : (
              <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">
                {accounts.map((a) => (
                  <label key={a.id} className="min-w-44 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-account-id"
                      value={a.id}
                      checked={accountId === a.id}
                      onChange={() => setAccountId(a.id)}
                      className="peer sr-only"
                      required
                    />
                    <span className="flex min-h-14 flex-col rounded-md border border-border bg-background px-3 py-2 text-left transition peer-checked:border-foreground peer-checked:ring-1 peer-checked:ring-foreground">
                      <span className="text-sm font-medium text-foreground">{a.name}</span>
                      <span className="text-xs text-muted">{defaultCurrency}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          {kind === "transfer" ? (
            <label className="grid gap-1 text-sm">
              <span className="text-muted">
                <span className="text-foreground" aria-hidden>
                  *
                </span>{" "}
                To Account
              </span>
              {toAccountOptions.length === 0 ? (
                <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
                  Add another account to create transfers.
                </p>
              ) : (
                <select
                  className={inputCls}
                  value={effectiveToAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                >
                  {toAccountOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ) : (
            <fieldset className="grid min-w-0 gap-1 text-sm">
              <legend className="text-muted">Category</legend>
              <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">
                <label className="min-w-32 cursor-pointer">
                  <input
                    type="radio"
                    name="edit-category-id"
                    value=""
                    checked={categoryId === ""}
                    onChange={() => setCategoryId("")}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-14 items-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition peer-checked:border-foreground peer-checked:ring-1 peer-checked:ring-foreground">
                    No category
                  </span>
                </label>
                {categorySelectGroups.map((g) =>
                  g.type === "single" ? (
                    <label key={g.category.id} className="min-w-44 cursor-pointer">
                      <input
                        type="radio"
                        name="edit-category-id"
                        value={g.category.id}
                        checked={categoryId === g.category.id}
                        onChange={() => setCategoryId(g.category.id)}
                        className="peer sr-only"
                      />
                      <span className="flex min-h-14 items-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition peer-checked:border-foreground peer-checked:ring-1 peer-checked:ring-foreground">
                        {moneyCategoryLabel(g.category, categoryById)}
                      </span>
                    </label>
                  ) : (
                    [
                      <label key={g.parent.id} className="min-w-44 cursor-pointer">
                        <input
                          type="radio"
                          name="edit-category-id"
                          value={g.parent.id}
                          checked={categoryId === g.parent.id}
                          onChange={() => setCategoryId(g.parent.id)}
                          className="peer sr-only"
                        />
                        <span className="flex min-h-14 items-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition peer-checked:border-foreground peer-checked:ring-1 peer-checked:ring-foreground">
                          {g.parent.name}
                        </span>
                      </label>,
                      ...g.children.map((c) => (
                        <label key={c.id} className="min-w-44 cursor-pointer">
                          <input
                            type="radio"
                            name="edit-category-id"
                            value={c.id}
                            checked={categoryId === c.id}
                            onChange={() => setCategoryId(c.id)}
                            className="peer sr-only"
                          />
                          <span className="flex min-h-14 items-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition peer-checked:border-foreground peer-checked:ring-1 peer-checked:ring-foreground">
                            {c.name}
                          </span>
                        </label>
                      )),
                    ]
                  ),
                )}
              </div>
            </fieldset>
          )}
          <label className="grid gap-1 text-sm">
            <span className="text-muted">When</span>
            <input
              type="datetime-local"
              className={dateTimeLocalCls}
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Merchant</span>
            <select
              className={inputCls}
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
            >
              <option value="">—</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="grid min-w-0 gap-2 text-sm [grid-column:1/-1]">
            <legend className="text-sm text-muted">Tags</legend>
            {tags.length === 0 ? (
              <p className="text-xs text-muted">No tags in workspace.</p>
            ) : (
              <ul className="flex max-h-40 flex-wrap gap-x-4 gap-y-2 overflow-y-auto rounded-md border border-border bg-background p-3 text-sm">
                {tags.map((t) => (
                  <li key={t.id}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(t.id)}
                        onChange={() => toggleTag(t.id)}
                        className="rounded border-border"
                      />
                      <span>{t.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <label className="grid min-w-0 gap-1 text-sm [grid-column:1/-1]">
            <span className="text-muted">Notes</span>
            <textarea
              className={`${inputCls} min-h-[5.5rem] resize-y`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={
                accounts.length === 0 || !accountId || saving || deleting
              }
              className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={saving || deleting}
              className="rounded-md border border-red-500/50 bg-transparent px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
