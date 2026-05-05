"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { formatMinor, parseMajorToMinor } from "@/lib/format-money";
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
};

export function MoneySettingsAccountsSection() {
  const notify = useNotify();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccount, setNewAccount] = useState("");
  const [newAccountType, setNewAccountType] =
    useState<(typeof ACCOUNT_TYPES)[number]>("checking");
  const [newAccountBalanceMajor, setNewAccountBalanceMajor] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    const { data } = await moneyApiJson<Account[]>("/api/money/accounts");
    setAccounts(data);
  }, []);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccount.trim()) return;
    try {
      const parsedBal = parseMajorToMinor(newAccountBalanceMajor.trim());
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
      <MoneySettingsBackLink />
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
              placeholder="0.00"
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
            {accounts.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                {a.name} · {a.type} · {a.currency} ·{" "}
                {formatMinor(a.balanceMinor, a.currency)}
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
