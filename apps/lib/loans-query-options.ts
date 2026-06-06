import { queryOptions } from "@tanstack/react-query";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import {
  LOAN_DETAIL_QUERY,
  LOANS_BOOTSTRAP_QUERY,
  LOANS_DUE_QUERY,
  LOANS_LIST_QUERY,
} from "@/lib/loans-gql-documents";

export type LoansBootstrapData = {
  workspaceId: string;
  defaultCurrency: string | null;
  needsCurrencySetup: boolean;
  defaultWorkspaceId: string | null;
  dueCount: number;
  workspaces: Array<{
    id: string;
    name: string;
    kind: string;
    defaultCurrency: string | null;
    role: string;
    isDefault: boolean;
  }>;
};

export type LoanListItem = {
  id: string;
  name: string;
  currency: string;
  principalMinor: number;
  annualRateBps: number;
  termMonths: number;
  paymentMinor: number;
  calculationMethod: string;
  status: string;
  percentComplete: number;
  remainingMinor: number;
  nextDueDate: string | null;
};

export type LoanDetail = LoanListItem & {
  startDate: string;
  dueDayOfMonth: number;
  collateralValueMinor: number | null;
  moneyAccountId: string | null;
  moneyCategoryId: string | null;
  summary: {
    totalPaidMinor: number;
    remainingMinor: number;
    percentComplete: number;
    projectedPayoffDate: string | null;
    monthsAheadBehind: number;
  };
  chart: Array<{
    label: string;
    scheduledCumulativeMinor: number;
    actualCumulativeMinor: number;
    projectedCumulativeMinor: number;
  }>;
  installments: Array<{
    scheduleInstallmentId: string;
    installmentNumber: number;
    dueDate: string;
    paymentMinor: number;
    principalMinor: number;
    interestMinor: number;
    balanceAfterMinor: number;
    status: string;
    paidAt: string | null;
    moneyTransactionId: string | null;
    paidWithoutTransaction: boolean;
  }>;
};

export type DueInstallment = {
  scheduleInstallmentId: string;
  loanId: string;
  loanName: string;
  installmentNumber: number;
  dueDate: string;
  paymentMinor: number;
  currency: string;
};

export const loansKeys = {
  all: ["loans"] as const,
  bootstrap: () => [...loansKeys.all, "bootstrap"] as const,
  list: () => [...loansKeys.all, "list"] as const,
  detail: (id: string) => [...loansKeys.all, "detail", id] as const,
  due: () => [...loansKeys.all, "due"] as const,
};

export function loansBootstrapQueryOptions() {
  return queryOptions({
    queryKey: loansKeys.bootstrap(),
    queryFn: async () => {
      const data = await loansGraphQLRequest<{ loansBootstrap: LoansBootstrapData }>(
        LOANS_BOOTSTRAP_QUERY,
      );
      return data.loansBootstrap;
    },
  });
}

export function loansListQueryOptions() {
  return queryOptions({
    queryKey: loansKeys.list(),
    queryFn: async () => {
      const data = await loansGraphQLRequest<{ loans: LoanListItem[] }>(
        LOANS_LIST_QUERY,
      );
      return data.loans;
    },
  });
}

export function loanDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: loansKeys.detail(id),
    queryFn: async () => {
      const data = await loansGraphQLRequest<{ loan: LoanDetail }>(
        LOAN_DETAIL_QUERY,
        { id },
      );
      return data.loan;
    },
  });
}

export function loansDueQueryOptions() {
  return queryOptions({
    queryKey: loansKeys.due(),
    queryFn: async () => {
      const data = await loansGraphQLRequest<{
        loansDueInstallments: DueInstallment[];
      }>(LOANS_DUE_QUERY);
      return data.loansDueInstallments;
    },
  });
}
