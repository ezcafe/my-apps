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
  invalidateInvestmentWorkspaceQueries,
  investmentBootstrapQueryOptions,
} from "@/lib/investment-query-options";

type InvestmentWorkspaceContextValue = {
  workspaceId: string | null;
  defaultCurrency: string;
  needsCurrencySetup: boolean;
  workspaceReady: boolean;
  refresh: () => Promise<void>;
};

const DEFAULT_CURRENCY = "USD";

const InvestmentWorkspaceContext = createContext<InvestmentWorkspaceContextValue>({
  workspaceId: null,
  defaultCurrency: DEFAULT_CURRENCY,
  needsCurrencySetup: false,
  workspaceReady: false,
  refresh: async () => {},
});

export function useInvestmentWorkspace() {
  return useContext(InvestmentWorkspaceContext);
}

export function InvestmentWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const canRun = status !== "unauthenticated";

  const bootstrapQuery = useQuery({
    ...investmentBootstrapQueryOptions(),
    enabled: canRun,
  });

  const workspaceId = bootstrapQuery.data?.workspaceId ?? null;
  const defaultCurrency =
    bootstrapQuery.data?.defaultCurrency ?? DEFAULT_CURRENCY;
  const needsCurrencySetup = bootstrapQuery.data?.needsCurrencySetup ?? false;

  const refresh = useCallback(async () => {
    await invalidateInvestmentWorkspaceQueries(queryClient);
  }, [queryClient]);

  const value = useMemo<InvestmentWorkspaceContextValue>(
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
    <InvestmentWorkspaceContext.Provider value={value}>
      {children}
    </InvestmentWorkspaceContext.Provider>
  );
}
