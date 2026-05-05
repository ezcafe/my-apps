"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { formatMinor, parseMajorToMinor } from "@/lib/format-money";
import { moneyApiJson } from "@/lib/money-fetch";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";

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
  role: "owner" | "member";
  isDefault: boolean;
};

export function MoneyDashboard() {
  const { data: session } = useSession();
  const userSub = session?.user?.id;
  const notify = useNotify();

  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  const [accountId, setAccountId] = useState("");
  const [kind, setKind] = useState<"expense" | "income" | "transfer">(
    "expense",
  );
  const [amountMajor, setAmountMajor] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    () => new Date().toISOString().slice(0, 16),
  );
  const [categoryId, setCategoryId] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [notes, setNotes] = useState("");
  /** Space-separated tag names; created and linked when the transaction is saved. */
  const [tagsInput, setTagsInput] = useState("");

  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);
  const categorySelectGroups = useMemo(
    () => moneyCategorySelectGroups(categories),
    [categories],
  );

  const loadAccounts = useCallback(async () => {
    const { data } = await moneyApiJson<Account[]>("/api/money/accounts");
    setAccounts(data);
    setAccountId((prev) => {
      if (data.length === 0) return "";
      const ok = data.some((a) => a.id === prev);
      if (ok) return prev;
      const firstCredit = data.find((a) => a.type === "credit");
      return firstCredit?.id ?? data[0].id;
    });
  }, []);
  const loadCategories = useCallback(async () => {
    const { data } = await moneyApiJson<Category[]>("/api/money/categories");
    setCategories(data);
  }, []);
  const loadMerchants = useCallback(async () => {
    const { data } = await moneyApiJson<Merchant[]>("/api/money/merchants");
    setMerchants(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const initRes = await moneyApiJson<{ workspaceId: string }>(
            "/api/money/workspace/init",
          );
          if (cancelled) return;
          const { data: wsData } = await moneyApiJson<WorkspaceRow[]>(
            "/api/workspace/list?app=money",
          );
          if (cancelled) return;
          setWorkspaces(wsData);
          let resolvedId = initRes.data.workspaceId;
          if (!wsData.some((w) => w.id === resolvedId)) {
            resolvedId =
              wsData.find((w) => w.isDefault)?.id ??
              wsData[0]?.id ??
              resolvedId;
          }
          setActiveWorkspaceId(resolvedId);
          if (
            resolvedId &&
            resolvedId !== initRes.data.workspaceId &&
            wsData.some((w) => w.id === resolvedId)
          ) {
            await moneyApiJson("/api/workspace/active", {
              method: "POST",
              body: JSON.stringify({
                workspaceId: resolvedId,
                app: "money",
              }),
            });
          }
          if (cancelled) return;
          await Promise.all([
            loadAccounts(),
            loadCategories(),
            loadMerchants(),
          ]);
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
  }, [loadAccounts, loadCategories, loadMerchants]);

  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  async function saveTransaction(e: React.FormEvent) {
    e.preventDefault();
    try {
      const minor = parseMajorToMinor(amountMajor);
      if (!accountId) throw new Error("Pick an account");
      if (minor == null || minor <= 0) throw new Error("Invalid amount");

      const body: Record<string, unknown> = {
        accountId,
        amountMinor: minor,
        kind,
      };
      if (occurredAt.trim()) {
        body.occurredAt = new Date(occurredAt).toISOString();
      }
      if (categoryId) body.categoryId = categoryId;
      if (merchantId) body.merchantId = merchantId;
      if (notes.trim()) body.notes = notes.trim();
      const tagNames = tagsInput
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const uniqueTagNames = [...new Set(tagNames)];
      if (uniqueTagNames.length > 0) body.tagNames = uniqueTagNames;

      await moneyApiJson("/api/money/transactions", {
        method: "POST",
        body: JSON.stringify(body),
      });
      notify.success("Transaction added", "Your entry was saved.");
      setAmountMajor("");
      setNotes("");
      setTagsInput("");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save transaction",
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-sm font-sans font-normal leading-normal tracking-normal text-foreground antialiased w-full min-w-0";
  const dateTimeLocalCls = `${inputCls} [&::-webkit-datetime-edit]:font-sans [&::-webkit-datetime-edit-fields-wrapper]:font-sans`;

  return (
    <div className="flex flex-col gap-6">
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
        />
      ) : null}

      <section className="rounded-md border border-border bg-surface p-4">
        <h2 className="text-lg font-medium">Transaction</h2>
        <form
          className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
          onSubmit={saveTransaction}
        >
          <label className="grid gap-1 text-sm">
            <span className="text-muted">
              <span className="text-foreground" aria-hidden>
                *
              </span>{" "}
              Amount
            </span>
            <input
              ref={amountInputRef}
              className={inputCls}
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
              placeholder="24.99"
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Workspace</span>
            <select
              className={inputCls}
              value={activeWorkspaceId}
              disabled={workspaces.length === 0}
              onChange={async (e) => {
                const next = e.target.value;
                if (!next || next === activeWorkspaceId) return;
                try {
                  await moneyApiJson("/api/workspace/active", {
                    method: "POST",
                    body: JSON.stringify({
                      workspaceId: next,
                      app: "money",
                    }),
                  });
                  setActiveWorkspaceId(next);
                  await Promise.all([
                    loadAccounts(),
                    loadCategories(),
                    loadMerchants(),
                  ]);
                  notify.success("Workspace switched", "Ledger data was refreshed.");
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
                  (mine ? " · Personal" : w.kind === "shared" ? " · Shared" : "");
                return (
                  <option key={w.id} value={w.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">
              <span className="text-foreground" aria-hidden>
                *
              </span>{" "}
              Account
            </span>
            {accounts.length === 0 ? (
              <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
                No accounts yet. Add one in Settings.
              </p>
            ) : (
              <select
                className={inputCls}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {formatMinor(a.balanceMinor, a.currency)}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Kind</span>
            <select
              className={inputCls}
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as typeof kind)
              }
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Category</span>
            <select
              className={inputCls}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">—</option>
              {categorySelectGroups.map((g) =>
                g.type === "single" ? (
                  <option key={g.category.id} value={g.category.id}>
                    {moneyCategoryLabel(g.category, categoryById)}
                  </option>
                ) : (
                  <optgroup key={g.parent.id} label={g.parent.name}>
                    <option value={g.parent.id}>{g.parent.name}</option>
                    {g.children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ),
              )}
            </select>
          </label>
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
          <label className="grid min-w-0 gap-1 text-sm [grid-column:1/-1]">
            <span className="text-muted">Tags</span>
            <input
              type="text"
              className={inputCls}
              placeholder="groceries travel"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <span className="text-xs text-muted">
              Separate tags with spaces. Tags are created and linked when you save the transaction.
            </span>
          </label>
          <label className="grid min-w-0 gap-1 text-sm [grid-column:1/-1]">
            <span className="text-muted">Notes</span>
            <textarea
              className={`${inputCls} min-h-[5.5rem] resize-y`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div>
            <button
              type="submit"
              disabled={accounts.length === 0 || !accountId}
              className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save transaction
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
