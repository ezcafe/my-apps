"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { moneyApiJson } from "@/lib/money-fetch";

type WorkspaceInitPayload = {
  workspaceId: string;
  defaultCurrency: string | null;
  needsCurrencySetup: boolean;
};

type WorkspaceCurrencyContextValue = {
  workspaceId: string | null;
  defaultCurrency: string;
  refreshWorkspaceCurrency: () => Promise<void>;
};

const DEFAULT_CURRENCY = "USD";

const WorkspaceCurrencyContext = createContext<WorkspaceCurrencyContextValue>({
  workspaceId: null,
  defaultCurrency: DEFAULT_CURRENCY,
  refreshWorkspaceCurrency: async () => {},
});

export function useWorkspaceCurrency() {
  return useContext(WorkspaceCurrencyContext);
}

/** Ensures Money workspace bootstrap runs once the Pocket ID session exists (sets ctx_workspace_money cookie). */
export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
  const [needsCurrencySetup, setNeedsCurrencySetup] = useState(false);
  const [currencyPick, setCurrencyPick] = useState(DEFAULT_CURRENCY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refreshWorkspaceCurrency = useCallback(async () => {
    if (status !== "authenticated") return;
    const { data } = await moneyApiJson<WorkspaceInitPayload>(
      "/api/money/workspace/init",
    );
    setWorkspaceId(data.workspaceId);
    const resolved = data.defaultCurrency ?? DEFAULT_CURRENCY;
    setDefaultCurrency(resolved);
    setNeedsCurrencySetup(data.needsCurrencySetup);
    setCurrencyPick(resolved);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    queueMicrotask(() => {
      void refreshWorkspaceCurrency().catch(() => {});
    });
  }, [status, refreshWorkspaceCurrency]);

  const value = useMemo<WorkspaceCurrencyContextValue>(
    () => ({
      workspaceId,
      defaultCurrency,
      refreshWorkspaceCurrency,
    }),
    [workspaceId, defaultCurrency, refreshWorkspaceCurrency],
  );

  return (
    <WorkspaceCurrencyContext.Provider value={value}>
      {children}
      {needsCurrencySetup && workspaceId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-md border border-border bg-surface p-4 shadow-lg">
            <h2 className="text-lg font-medium">Set workspace currency</h2>
            <p className="mt-1 text-sm text-muted">
              Choose a default currency before using Money features.
            </p>
            <form
              className="mt-4 grid gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setErr(null);
                setSaving(true);
                try {
                  await moneyApiJson("/api/workspace/currency", {
                    method: "PATCH",
                    body: JSON.stringify({
                      workspaceId,
                      defaultCurrency: currencyPick,
                    }),
                  });
                  await refreshWorkspaceCurrency();
                } catch (error: unknown) {
                  setErr(error instanceof Error ? error.message : "Error");
                } finally {
                  setSaving(false);
                }
              }}
            >
              <label className="grid gap-1 text-sm">
                <span className="text-muted">Default currency</span>
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={currencyPick}
                  onChange={(e) => setCurrencyPick(e.target.value)}
                >
                  {["USD", "VND", "EUR", "GBP", "JPY"].map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              {err ? <p className="text-sm text-red-500">{err}</p> : null}
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save currency"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </WorkspaceCurrencyContext.Provider>
  );
}
