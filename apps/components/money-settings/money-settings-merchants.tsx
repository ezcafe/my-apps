"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_LIST_MERCHANTS_QUERY,
  MONEY_MERCHANT_CREATE_MUTATION,
  MONEY_MERCHANT_DELETE_MUTATION,
  MONEY_MERCHANT_UPDATE_MUTATION,
} from "@/lib/money-gql-documents";
import {
  inputCls,
  MoneySettingsBackLink,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

type Merchant = { id: string; name: string };

export function MoneySettingsMerchantsSection() {
  const notify = useNotify();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [newMerchant, setNewMerchant] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const loadMerchants = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyMerchants: Merchant[] }>(
      MONEY_LIST_MERCHANTS_QUERY,
    );
    setMerchants(res.moneyMerchants);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await loadMerchants();
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
  }, [loadMerchants]);

  function startEdit(m: Merchant) {
    setEditingId(m.id);
    setEditName(m.name);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    try {
      await moneyGraphQLRequest(MONEY_MERCHANT_UPDATE_MUTATION, {
        id: editingId,
        input: { name: editName.trim() },
      });
      cancelEdit();
      await loadMerchants();
      notify.success("Settings updated", "Merchant saved.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  async function deleteMerchant(id: string, name: string) {
    if (
      !window.confirm(`Delete merchant “${name}”? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await moneyGraphQLRequest(MONEY_MERCHANT_DELETE_MUTATION, { id });
      if (editingId === id) cancelEdit();
      await loadMerchants();
      notify.success("Settings updated", "Merchant deleted.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t delete merchant",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newMerchant.trim()) return;
    try {
      await moneyGraphQLRequest(MONEY_MERCHANT_CREATE_MUTATION, {
        input: { name: newMerchant.trim() },
      });
      setNewMerchant("");
      await loadMerchants();
      notify.success("Settings updated", "Merchant added.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  return (
    <>
      <MoneySettingsBackLink current="Merchants" />
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection id="money-settings-merchants-page" title="Merchants">
        <form className="flex max-w-xl flex-col gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Name</span>
            <input
              className={inputCls}
              placeholder="Coffee shop"
              value={newMerchant}
              onChange={(e) => setNewMerchant(e.target.value)}
            />
          </label>
          <button type="submit" className={`${secondaryBtnCls} self-start`}>
            Add merchant
          </button>
        </form>
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Existing merchants</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {merchants.map((m) => (
              <li
                key={m.id}
                className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 transition-colors duration-150 hover:border-foreground/30"
              >
                {editingId === m.id ? (
                  <form className="flex flex-col gap-3" onSubmit={saveEdit}>
                    <input
                      className={inputCls}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="Merchant name"
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
                    <span className="text-foreground">{m.name}</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                        onClick={() => startEdit(m)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                        onClick={() => void deleteMerchant(m.id, m.name)}
                      >
                        Delete
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
