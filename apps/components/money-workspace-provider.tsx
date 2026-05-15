"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_WORKSPACE_CURRENCY_MUTATION } from "@/lib/money-gql-documents";
import { moneyBootstrapQueryOptions } from "@/lib/money-query-options";

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

/** Money workspace + default currency; only mount under `/money` (see `money/layout.tsx`). */
export function useWorkspaceCurrency() {
  return useContext(WorkspaceCurrencyContext);
}

function MoneyWorkspaceSkeleton() {
  return (
    <div
      className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 py-8 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-8"
      role="status"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <Skeleton className="col-span-2 h-10 md:col-span-6 lg:col-span-12" />
      <Skeleton className="col-span-2 h-48 md:col-span-6 lg:col-span-8" />
      <Skeleton className="col-span-2 h-48 md:col-span-6 lg:col-span-4" />
      <Skeleton className="col-span-2 h-64 md:col-span-6 lg:col-span-12" />
    </div>
  );
}

function MoneyWorkspaceAuthenticated({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: boot } = useSuspenseQuery(moneyBootstrapQueryOptions());

  const [currencyPick, setCurrencyPick] = useState(
    boot.defaultCurrency ?? DEFAULT_CURRENCY,
  );
  useEffect(() => {
    setCurrencyPick(boot.defaultCurrency ?? DEFAULT_CURRENCY);
  }, [boot.defaultCurrency]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const workspaceId = boot.workspaceId;
  const defaultCurrency = boot.defaultCurrency ?? DEFAULT_CURRENCY;
  const needsCurrencySetup = boot.needsCurrencySetup;

  const refreshWorkspaceCurrency = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["money", "bootstrap"] });
  }, [queryClient]);

  const value = useMemo<WorkspaceCurrencyContextValue>(
    () => ({
      workspaceId,
      defaultCurrency,
      refreshWorkspaceCurrency,
    }),
    [workspaceId, defaultCurrency, refreshWorkspaceCurrency],
  );

  const modalOpen = needsCurrencySetup && workspaceId != null;

  return (
    <WorkspaceCurrencyContext.Provider value={value}>
      {children}
      <Modal
        open={modalOpen}
        onClose={() => {}}
        title="Set workspace currency"
        className="max-w-md"
      >
        <p className="text-sm text-muted">
          Choose a default currency before using Money features.
        </p>
        <form
          className="mt-4 grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setSaving(true);
            try {
              await moneyGraphQLRequest(MONEY_WORKSPACE_CURRENCY_MUTATION, {
                workspaceId,
                defaultCurrency: currencyPick,
              });
              await refreshWorkspaceCurrency();
            } catch (error: unknown) {
              setErr(error instanceof Error ? error.message : "Error");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Field label="Default currency" required>
            <Select
              value={currencyPick}
              onChange={(e) => setCurrencyPick(e.target.value)}
            >
              {["USD", "VND", "EUR", "GBP", "JPY"].map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          </Field>
          {err ? (
            <Alert variant="error" title="Couldn’t save currency" description={err} />
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saving}
            className="w-fit"
          >
            {saving ? "Saving…" : "Save currency"}
          </Button>
        </form>
      </Modal>
    </WorkspaceCurrencyContext.Provider>
  );
}

/**
 * Bootstraps Money workspace (`ctx_workspace_money`), default currency, and optional
 * first-time currency modal. Scoped to the Money route tree so other shell routes do
 * not call Money APIs on load.
 */
export function MoneyWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();

  if (status === "loading") {
    return <MoneyWorkspaceSkeleton />;
  }

  if (status !== "authenticated") {
    return (
      <WorkspaceCurrencyContext.Provider
        value={{
          workspaceId: null,
          defaultCurrency: DEFAULT_CURRENCY,
          refreshWorkspaceCurrency: async () => {},
        }}
      >
        {children}
      </WorkspaceCurrencyContext.Provider>
    );
  }

  return (
    <Suspense fallback={<MoneyWorkspaceSkeleton />}>
      <MoneyWorkspaceAuthenticated>{children}</MoneyWorkspaceAuthenticated>
    </Suspense>
  );
}
