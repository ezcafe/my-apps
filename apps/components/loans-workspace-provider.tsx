"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useNotify } from "@/components/notification-provider";
import { registerLoansServiceWorker } from "@/lib/loans-push-client";
import {
  loansBootstrapQueryOptions,
  loansKeys,
} from "@/lib/loans-query-options";

type LoansWorkspaceContextValue = {
  workspaceId: string | null;
  defaultCurrency: string;
  needsCurrencySetup: boolean;
  workspaceReady: boolean;
  dueCount: number;
  refresh: () => Promise<void>;
};

const DEFAULT_CURRENCY = "USD";

const LoansWorkspaceContext = createContext<LoansWorkspaceContextValue>({
  workspaceId: null,
  defaultCurrency: DEFAULT_CURRENCY,
  needsCurrencySetup: false,
  workspaceReady: false,
  dueCount: 0,
  refresh: async () => {},
});

export function useLoansWorkspace() {
  return useContext(LoansWorkspaceContext);
}

function LoansDueToast({ dueCount }: { dueCount: number }) {
  const notify = useNotify();
  const shown = useRef(false);

  useEffect(() => {
    if (dueCount <= 0 || shown.current) return;
    shown.current = true;
    notify.warning(
      "Loan payment due",
      dueCount === 1
        ? "You have 1 installment due or overdue."
        : `You have ${dueCount} installments due or overdue.`,
    );
  }, [dueCount, notify]);

  return null;
}

export function LoansWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const canRun = status === "authenticated" && typeof window !== "undefined";

  const bootstrapQuery = useQuery({
    ...loansBootstrapQueryOptions(),
    enabled: canRun,
  });

  useEffect(() => {
    if (!canRun) return;
    void registerLoansServiceWorker();
  }, [canRun]);

  const workspaceId = bootstrapQuery.data?.workspaceId ?? null;
  const defaultCurrency =
    bootstrapQuery.data?.defaultCurrency ?? DEFAULT_CURRENCY;
  const needsCurrencySetup = bootstrapQuery.data?.needsCurrencySetup ?? false;
  const dueCount = bootstrapQuery.data?.dueCount ?? 0;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: loansKeys.all });
  }, [queryClient]);

  const value = useMemo<LoansWorkspaceContextValue>(
    () => ({
      workspaceId,
      defaultCurrency,
      needsCurrencySetup,
      workspaceReady: bootstrapQuery.isSuccess,
      dueCount,
      refresh,
    }),
    [
      workspaceId,
      defaultCurrency,
      needsCurrencySetup,
      bootstrapQuery.isSuccess,
      dueCount,
      refresh,
    ],
  );

  return (
    <LoansWorkspaceContext.Provider value={value}>
      {bootstrapQuery.isSuccess && dueCount > 0 ? (
        <LoansDueToast dueCount={dueCount} />
      ) : null}
      {children}
    </LoansWorkspaceContext.Provider>
  );
}
