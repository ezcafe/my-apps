"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  savingsBootstrapQueryOptions,
  savingsKeys,
} from "@/lib/savings-query-options";

type SavingsWorkspaceContextValue = {
  workspaceId: string | null;
  defaultCurrency: string;
  needsCurrencySetup: boolean;
  workspaceReady: boolean;
  refresh: () => Promise<void>;
};

const DEFAULT_CURRENCY = "USD";

const SavingsWorkspaceContext = createContext<SavingsWorkspaceContextValue>({
  workspaceId: null,
  defaultCurrency: DEFAULT_CURRENCY,
  needsCurrencySetup: false,
  workspaceReady: false,
  refresh: async () => {},
});

export function useSavingsWorkspace() {
  return useContext(SavingsWorkspaceContext);
}

export function SavingsWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const canRun = status === "authenticated" && typeof window !== "undefined";

  const bootstrapQuery = useQuery({
    ...savingsBootstrapQueryOptions(),
    enabled: canRun,
  });

  const workspaceId = bootstrapQuery.data?.workspaceId ?? null;
  const defaultCurrency =
    bootstrapQuery.data?.defaultCurrency ?? DEFAULT_CURRENCY;
  const needsCurrencySetup = bootstrapQuery.data?.needsCurrencySetup ?? false;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
  }, [queryClient]);

  const value = useMemo<SavingsWorkspaceContextValue>(
    () => ({
      workspaceId,
      defaultCurrency,
      needsCurrencySetup,
      workspaceReady: bootstrapQuery.isSuccess,
      refresh,
    }),
    [
      workspaceId,
      defaultCurrency,
      needsCurrencySetup,
      bootstrapQuery.isSuccess,
      refresh,
    ],
  );

  return (
    <SavingsWorkspaceContext.Provider value={value}>
      {children}
    </SavingsWorkspaceContext.Provider>
  );
}
