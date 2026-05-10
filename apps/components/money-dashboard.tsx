"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { useWorkspaceCurrency } from "@/components/workspace-gate";
import { Alert } from "@/components/ui/alert";
import { formatMinor, parseMajorToMinor } from "@/lib/format-money";
import { moneyApiJson } from "@/lib/money-fetch";
import {
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

export function MoneyDashboard() {
  const { data: session } = useSession();
  const userSub = session?.user?.id;
  const notify = useNotify();
  const { defaultCurrency, refreshWorkspaceCurrency } = useWorkspaceCurrency();

  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [kind, setKind] = useState<"expense" | "income" | "transfer">(
    "expense",
  );
  const [amountMajor, setAmountMajor] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    () => new Date().toISOString().slice(0, 16),
  );
  const [categoryId, setCategoryId] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("No category");
  const [categoryFilterQuery, setCategoryFilterQuery] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [notes, setNotes] = useState("");
  /** Space-separated tag names; created and linked when the transaction is saved. */
  const [tagsInput, setTagsInput] = useState("");

  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);
  const categoryGroups = useMemo(() => {
    const groups = moneyCategorySelectGroups(categories);
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
  }, [categories, categoryById]);
  const categoryOptions = useMemo(
    () => categoryGroups.flatMap((group) => group.options),
    [categoryGroups],
  );
  const selectedCategoryLabel = useMemo(
    () => categoryOptions.find((option) => option.id === categoryId)?.label ?? "",
    [categoryOptions, categoryId],
  );
  const filteredCategoryGroups = useMemo(() => {
    const query = categoryFilterQuery.trim().toLowerCase();
    if (!query) return categoryGroups;
    return categoryGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) =>
          option.label.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.options.length > 0);
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
              body: JSON.stringify({
                workspaceId: resolvedId,
                app: "money",
              }),
            });
            await refreshWorkspaceCurrency();
          }
          if (cancelled) return;
          setAccounts(boot.accounts);
          setAccountId((prev) => {
            const data = boot.accounts;
            if (data.length === 0) return "";
            const ok = data.some((a) => a.id === prev);
            if (ok) return prev;
            const firstCredit = data.find((a) => a.type === "credit");
            return firstCredit?.id ?? data[0].id;
          });
          setCategories(boot.categories);
          setMerchants(boot.merchants);
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
  }, [refreshWorkspaceCurrency]);

  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

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

  async function saveTransaction(e: React.FormEvent) {
    e.preventDefault();
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

      await moneyApiJson("/api/money/transactions", {
        method: "POST",
        body: JSON.stringify(body),
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
    }
  }

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-sm font-sans font-normal leading-normal tracking-normal text-foreground antialiased w-full min-w-0";
  const dateTimeLocalCls = `${inputCls} [&::-webkit-datetime-edit]:font-sans [&::-webkit-datetime-edit-fields-wrapper]:font-sans`;

  return (
    <div className="min-w-0 max-w-4xl space-y-6">
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
          className="mt-4 grid grid-cols-1 gap-3"
          onSubmit={saveTransaction}
        >
          <fieldset className="grid gap-1 text-sm">
            <legend className="text-muted">Kind</legend>
            <div className="flex gap-2 overflow-x-auto pb-1">
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
          {workspaces.length > 1 ? (
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
                    await refreshWorkspaceCurrency();
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
          ) : null}
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
              placeholder={defaultCurrency === "VND" ? "25" : "24.99"}
              required
            />
          </label>
          <fieldset className="grid gap-1 text-sm">
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
              <div className="flex gap-2 overflow-x-auto pb-1">
                {accounts.map((a) => (
                  <label key={a.id} className="min-w-48 cursor-pointer">
                    <input
                      type="radio"
                      name="account-id"
                      value={a.id}
                      checked={accountId === a.id}
                      onChange={() => setAccountId(a.id)}
                      className="peer sr-only"
                      required
                    />
                    <span className="flex min-h-14 flex-col rounded-md border border-border bg-background px-3 py-2 text-left transition peer-checked:border-foreground peer-checked:ring-1 peer-checked:ring-foreground">
                      <span className="text-sm font-medium text-foreground">{a.name}</span>
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
                      {a.name} · {formatMinor(a.balanceMinor, defaultCurrency)}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ) : null}
          {kind !== "transfer" ? (
            <fieldset className="relative grid gap-1 text-sm">
              <legend className="text-muted">Category</legend>
              <div className="relative">
                <input
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
                  className={inputCls}
                  role="combobox"
                  aria-expanded={categoryMenuOpen}
                  aria-controls="category-combobox-options"
                  aria-autocomplete="list"
                />
                {categoryMenuOpen ? (
                  <ul
                    id="category-combobox-options"
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-background p-1 shadow-lg"
                  >
                    {filteredCategoryGroups.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-muted">No matches</li>
                    ) : (
                      filteredCategoryGroups.map((group) => (
                        <li key={group.key}>
                          <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted">
                            {group.label}
                          </p>
                          <ul>
                            {group.options.map((option) => (
                              <li
                                key={option.id}
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
                                  className={`flex w-full items-center rounded-md py-2 pr-3 text-left text-sm ${
                                    option.isChild ? "pl-8" : "pl-3"
                                  } ${
                                    categoryId === option.id
                                      ? "bg-foreground text-background"
                                      : "text-foreground hover:bg-surface"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </div>
            </fieldset>
          ) : null}
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
              disabled={
                accounts.length === 0 ||
                !accountId ||
                (kind === "transfer" && !effectiveToAccountId)
              }
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
