"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { useWorkspaceCurrency } from "@/components/workspace-gate";
import { Alert } from "@/components/ui/alert";
import {
  formatMinor,
  minorToMajorInput,
  parseMajorToMinor,
} from "@/lib/format-money";
import { moneyApiJson } from "@/lib/money-fetch";
import {
  inputCls,
  MoneySettingsBackLink,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
  "credit",
  "loan",
  "investment",
  "other",
] as const;

type Account = {
  id: string;
  name: string;
  currency: string;
  type: string;
  balanceMinor: number;
  archived: boolean;
};

export function MoneySettingsAccountsSection() {
  const notify = useNotify();
  const { defaultCurrency } = useWorkspaceCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccount, setNewAccount] = useState("");
  const [newAccountType, setNewAccountType] =
    useState<(typeof ACCOUNT_TYPES)[number]>("checking");
  const [newAccountBalanceMajor, setNewAccountBalanceMajor] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<(typeof ACCOUNT_TYPES)[number]>("checking");
  const [editBalanceMajor, setEditBalanceMajor] = useState("");

  const loadAccounts = useCallback(async () => {
    const { data } = await moneyApiJson<Account[]>("/api/money/accounts");
    setAccounts(data as Account[]);
  }, []);

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.archived),
    [accounts],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await loadAccounts();
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
  }, [loadAccounts]);

  function startEdit(a: Account) {
    setEditingId(a.id);
    setEditName(a.name);
    setEditType(a.type as (typeof ACCOUNT_TYPES)[number]);
    setEditBalanceMajor(minorToMajorInput(a.balanceMinor, defaultCurrency));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    try {
      const parsedBal = parseMajorToMinor(editBalanceMajor.trim(), defaultCurrency);
      const balanceMinor = parsedBal ?? 0;
      await moneyApiJson(`/api/money/accounts/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          type: editType,
          balanceMinor,
        }),
      });
      setEditingId(null);
      await loadAccounts();
      notify.success("Settings updated", "Account saved.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  async function removeAccount(id: string, name: string) {
    if (
      !window.confirm(
        `Remove account “${name}”? It will be archived and hidden from this list.`,
      )
    ) {
      return;
    }
    try {
      await moneyApiJson(`/api/money/accounts/${id}`, { method: "DELETE" });
      if (editingId === id) setEditingId(null);
      await loadAccounts();
      notify.success("Settings updated", "Account removed.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t remove account",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccount.trim()) return;
    try {
      const parsedBal = parseMajorToMinor(
        newAccountBalanceMajor.trim(),
        defaultCurrency,
      );
      const balanceMinor = parsedBal ?? 0;
      await moneyApiJson("/api/money/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: newAccount.trim(),
          type: newAccountType,
          balanceMinor,
        }),
      });
      setNewAccount("");
      setNewAccountType("checking");
      setNewAccountBalanceMajor("");
      await loadAccounts();
      notify.success("Settings updated", "Account added.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  return (
    <>
      <MoneySettingsBackLink current="Accounts" />
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection id="money-settings-accounts-page" title="Accounts">
        <form className="flex max-w-xl flex-col gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Name</span>
            <input
              className={inputCls}
              placeholder="Checking"
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Type</span>
            <select
              className={inputCls}
              value={newAccountType}
              onChange={(e) =>
                setNewAccountType(e.target.value as (typeof ACCOUNT_TYPES)[number])
              }
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Balance</span>
            <input
              className={inputCls}
              inputMode="decimal"
              placeholder={defaultCurrency === "VND" ? "0" : "0.00"}
              value={newAccountBalanceMajor}
              onChange={(e) => setNewAccountBalanceMajor(e.target.value)}
            />
            <span className="text-xs text-muted">
              Current balance in major units; leave empty for 0.
            </span>
          </label>
          <button type="submit" className={`${secondaryBtnCls} self-start`}>
            Add account
          </button>
        </form>
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Existing accounts</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {visibleAccounts.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                {editingId === a.id ? (
                  <form className="flex flex-col gap-3" onSubmit={saveEdit}>
                    <input
                      className={inputCls}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="Account name"
                    />
                    <select
                      className={inputCls}
                      value={editType}
                      onChange={(e) =>
                        setEditType(e.target.value as (typeof ACCOUNT_TYPES)[number])
                      }
                      aria-label="Account type"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputCls}
                      inputMode="decimal"
                      value={editBalanceMajor}
                      onChange={(e) => setEditBalanceMajor(e.target.value)}
                      aria-label="Balance"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className={secondaryBtnCls}>
                        Save
                      </button>
                      <button type="button" className={secondaryBtnCls} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {a.name} · {a.type} · {defaultCurrency} ·{" "}
                      {formatMinor(a.balanceMinor, defaultCurrency)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                        onClick={() => startEdit(a)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                        onClick={() => void removeAccount(a.id, a.name)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
