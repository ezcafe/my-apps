"use client";

import { presentClientError, toUserFacingMessage } from "@/lib/user-facing-error";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  formatMinor,
  minorToMajorInput,
  parseMajorToMinor,
} from "@/lib/format-money";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_ACCOUNT_ARCHIVE_MUTATION,
  MONEY_ACCOUNT_CREATE_MUTATION,
  MONEY_ACCOUNT_UPDATE_MUTATION,
  MONEY_LIST_ACCOUNTS_QUERY,
} from "@/lib/money-gql-documents";
import {
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

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
  systemKey?: string | null;
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
    const res = await moneyGraphQLRequest<{ moneyAccounts: Account[] }>(
      MONEY_LIST_ACCOUNTS_QUERY,
    );
    setAccounts(res.moneyAccounts as Account[]);
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
            setBootstrapErr(presentClientError("money-settings-accounts", e));
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
      await moneyGraphQLRequest(MONEY_ACCOUNT_UPDATE_MUTATION, {
        id: editingId,
        input: {
          name: editName.trim(),
          type: editType,
          balanceMinor,
        },
      });
      setEditingId(null);
      await loadAccounts();
      notify.success("Settings updated", "Account saved.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        toUserFacingMessage(err, "Something went wrong"),
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
      await moneyGraphQLRequest(MONEY_ACCOUNT_ARCHIVE_MUTATION, { id });
      if (editingId === id) setEditingId(null);
      await loadAccounts();
      notify.success("Settings updated", "Account removed.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t remove account",
        toUserFacingMessage(err, "Something went wrong"),
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
      await moneyGraphQLRequest(MONEY_ACCOUNT_CREATE_MUTATION, {
        input: {
          name: newAccount.trim(),
          type: newAccountType,
          balanceMinor,
        },
      });
      setNewAccount("");
      setNewAccountType("checking");
      setNewAccountBalanceMajor("");
      await loadAccounts();
      notify.success("Settings updated", "Account added.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  return (
    <div className={MONEY_FULL_SPAN}>
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
          <Field label="Name" required>
            <Input
              placeholder="Checking"
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              required
            />
          </Field>
          <Field label="Type">
            <Select
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
            </Select>
          </Field>
          <Field
            label="Balance"
            hint="Current balance in major units; leave empty for 0."
          >
            <Input
              inputMode="decimal"
              placeholder={defaultCurrency === "VND" ? "0" : "0.00"}
              value={newAccountBalanceMajor}
              onChange={(e) => setNewAccountBalanceMajor(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="primary" className="self-start">
            Add account
          </Button>
        </form>
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Existing accounts</h3>
          <ul className="mt-3 divide-y divide-border rounded-[var(--radius-sm)] bg-background text-sm text-muted">
            {visibleAccounts.map((a) => (
              <li key={a.id} className="px-3 py-2.5">
                {editingId === a.id ? (
                  <form className="flex flex-col gap-3" onSubmit={saveEdit}>
                    <Field label="Name" required>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Type">
                      <Select
                        value={editType}
                        onChange={(e) =>
                          setEditType(e.target.value as (typeof ACCOUNT_TYPES)[number])
                        }
                        disabled={Boolean(a.systemKey)}
                      >
                        {ACCOUNT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Balance">
                      <Input
                        inputMode="decimal"
                        value={editBalanceMajor}
                        onChange={(e) => setEditBalanceMajor(e.target.value)}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" variant="primary" size="sm">
                        Save
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {a.name} · {a.type} · {defaultCurrency} ·{" "}
                      {formatMinor(a.balanceMinor, defaultCurrency)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(a)}
                      >
                        Edit
                      </Button>
                      {!a.systemKey ? (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void removeAccount(a.id, a.name)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </div>
  );
}
