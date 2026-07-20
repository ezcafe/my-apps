"use client";

import { presentClientError, queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_WORKSPACE_CURRENCY_MUTATION } from "@/lib/money-gql-documents";
import {
  invalidateMoneyWorkspaceQueries,
  moneyBootstrapQueryKey,
  moneyBootstrapQueryOptions,
  moneyWorkspaceStateQueryKey,
} from "@/lib/money-query-options";
import {
  browserTimezoneName,
  syncWorkspaceTimezone,
} from "@/lib/workspace-timezone";
import type {
  MoneyWorkspaceBootstrapData,
  MoneyWorkspaceCoreData,
} from "@/lib/money-workspace-bootstrap-data";

type WorkspaceCurrencyContextValue = {
  workspaceId: string | null;
  defaultCurrency: string;
  needsCurrencySetup: boolean;
  workspaceReady: boolean;
  refreshWorkspaceCurrency: () => Promise<void>;
};

const DEFAULT_CURRENCY = "USD";

const WorkspaceCurrencyContext = createContext<WorkspaceCurrencyContextValue>({
  workspaceId: null,
  defaultCurrency: DEFAULT_CURRENCY,
  needsCurrencySetup: false,
  workspaceReady: false,
  refreshWorkspaceCurrency: async () => {},
});

/** Money workspace + default currency; only mount under `/money` (see `money/layout.tsx`). */
export function useWorkspaceCurrency() {
  return useContext(WorkspaceCurrencyContext);
}

function MoneyWorkspaceAuthenticated({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const canRunMoneyQueries = typeof window !== "undefined";
  const bootstrapQuery = useQuery({
    ...moneyBootstrapQueryOptions(),
    enabled: canRunMoneyQueries,
  });
  const workspaceState = bootstrapQuery.data;

  useEffect(() => {
    const boot = bootstrapQuery.data;
    if (!boot?.workspaceId) return;
    queryClient.setQueryData(
      ["money", "analyticsChartLookups", boot.workspaceId],
      {
        moneyAccounts: boot.accounts,
        moneyCategories: boot.categories,
        moneyTags: boot.tags,
      },
    );
  }, [bootstrapQuery.data, queryClient]);

  useEffect(() => {
    const boot = bootstrapQuery.data;
    if (!boot?.workspaceId) return;
    const tzName = browserTimezoneName();
    if (!tzName) return;

    let cancelled = false;
    void (async () => {
      try {
        const result = await syncWorkspaceTimezone(boot.workspaceId, tzName);
        if (cancelled || result.unchanged) return;
        await queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "money" &&
            typeof query.queryKey[1] === "string" &&
            query.queryKey[1].startsWith("analytics"),
        });
      } catch {
        // Non-blocking; analytics falls back to stored workspace timezone.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapQuery.data?.workspaceId, queryClient]);
  const [currencyDraft, setCurrencyDraft] = useState<{
    workspaceId: string | null;
    value: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const workspaceId = workspaceState?.workspaceId ?? null;
  const defaultCurrency = workspaceState?.defaultCurrency ?? DEFAULT_CURRENCY;
  const needsCurrencySetup = workspaceState?.needsCurrencySetup ?? false;
  const workspaceReady = bootstrapQuery.isSuccess;
  const currencyPick =
    currencyDraft?.workspaceId === workspaceId
      ? currencyDraft.value
      : defaultCurrency;

  const refreshWorkspaceCurrency = useCallback(async () => {
    await invalidateMoneyWorkspaceQueries(queryClient);
  }, [queryClient]);

  const applySavedWorkspaceCurrency = useCallback(
    (savedCurrency: string) => {
      const patchCore = (old: MoneyWorkspaceCoreData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          defaultCurrency: savedCurrency,
          needsCurrencySetup: false,
          workspaces: old.workspaces.map((w) =>
            w.id === old.workspaceId
              ? { ...w, defaultCurrency: savedCurrency }
              : w,
          ),
        };
      };

      queryClient.setQueryData<MoneyWorkspaceBootstrapData | undefined>(
        moneyBootstrapQueryKey,
        (old) => {
          const patched = patchCore(old);
          return patched ? { ...old!, ...patched } : old;
        },
      );
      queryClient.setQueryData<MoneyWorkspaceCoreData | undefined>(
        moneyWorkspaceStateQueryKey,
        patchCore,
      );
    },
    [queryClient],
  );

  const value = useMemo<WorkspaceCurrencyContextValue>(
    () => ({
      workspaceId,
      defaultCurrency,
      needsCurrencySetup,
      workspaceReady,
      refreshWorkspaceCurrency,
    }),
    [
      workspaceId,
      defaultCurrency,
      needsCurrencySetup,
      workspaceReady,
      refreshWorkspaceCurrency,
    ],
  );

  const modalOpen = workspaceReady && needsCurrencySetup && workspaceId != null;

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
              const res = await moneyGraphQLRequest<{
                moneyWorkspaceCurrency: {
                  workspaceId: string;
                  defaultCurrency: string;
                };
              }>(MONEY_WORKSPACE_CURRENCY_MUTATION, {
                workspaceId,
                defaultCurrency: currencyPick,
              });
              applySavedWorkspaceCurrency(
                res.moneyWorkspaceCurrency.defaultCurrency,
              );
              setCurrencyDraft(null);
              void refreshWorkspaceCurrency();
            } catch (error: unknown) {
              setErr(presentClientError("money-workspace-provider", error));
            } finally {
              setSaving(false);
            }
          }}
        >
          <Field label="Default currency" required>
            <Select
              value={currencyPick}
              disabled={saving || workspaceId == null}
              onChange={(e) =>
                setCurrencyDraft({
                  workspaceId,
                  value: e.target.value,
                })
              }
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
 * first-time currency modal. Mount this around Money content that needs workspace
 * context so shell chrome can render before the bootstrap query resolves.
 */
export function MoneyWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();

  if (status !== "authenticated") {
    return (
      <WorkspaceCurrencyContext.Provider
        value={{
          workspaceId: null,
          defaultCurrency: DEFAULT_CURRENCY,
          needsCurrencySetup: false,
          workspaceReady: false,
          refreshWorkspaceCurrency: async () => {},
        }}
      >
        {children}
      </WorkspaceCurrencyContext.Provider>
    );
  }

  return <MoneyWorkspaceAuthenticated>{children}</MoneyWorkspaceAuthenticated>;
}
