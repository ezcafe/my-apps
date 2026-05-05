"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { moneyApiJson } from "@/lib/money-fetch";
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

  const loadMerchants = useCallback(async () => {
    const { data } = await moneyApiJson<Merchant[]>("/api/money/merchants");
    setMerchants(data);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newMerchant.trim()) return;
    try {
      await moneyApiJson("/api/money/merchants", {
        method: "POST",
        body: JSON.stringify({ name: newMerchant.trim() }),
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
      <MoneySettingsBackLink />
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
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                {m.name}
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
