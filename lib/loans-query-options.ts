import { queryOptions } from "@tanstack/react-query";
import { gqlMinor } from "@/lib/gql-minor";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import {
  LOAN_DETAIL_QUERY,
  LOANS_BOOTSTRAP_QUERY,
  LOANS_DUE_QUERY,
  LOANS_INSIGHTS_ATF_QUERY,
  LOANS_INSIGHTS_MORE_QUERY,
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
  nextScheduleInstallmentId: string | null;
  nextInstallmentNumber: number | null;
  moneyAccountId: string | null;
  moneyCategoryId: string | null;
};

export type LoanDetail = LoanListItem & {
  startDate: string;
  dueDayOfMonth: number;
  initialRateMonths: number | null;
  rateAfterInitialBps: number | null;
  paymentAfterRateChangeMinor: number | null;
  collateralValueMinor: number | null;
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
  moneyAccountId: string | null;
  moneyCategoryId: string | null;
};

export type LoansInsightsAtf = {
  range: { from: string; to: string };
  summary: {
    remainingMinor: number;
    monthlyObligationMinor: number;
    weightedAprBps: number | null;
    nextDueDate: string | null;
    loanCount: number;
  };
  remainingByLoan: Array<{ id: string; label: string; valueMinor: number }>;
  paidPrincipalMinor: number;
  paidInterestMinor: number;
};

export type LoansInsightsMore = {
  remainingInterestMinor: number;
  ltvPct: number | null;
  progress: Array<{
    id: string;
    name: string;
    remainingMinor: number;
    percentComplete: number;
  }>;
  combinedChart: Array<{
    label: string;
    scheduledCumulativeMinor: number;
    actualCumulativeMinor: number;
    projectedCumulativeMinor: number;
  }>;
};

export const loansKeys = {
  all: ["loans"] as const,
  bootstrap: () => [...loansKeys.all, "bootstrap"] as const,
  list: () => [...loansKeys.all, "list"] as const,
  detail: (id: string) => [...loansKeys.all, "detail", id] as const,
  due: () => [...loansKeys.all, "due"] as const,
  insightsAtf: (from: string, to: string) =>
    [...loansKeys.all, "insightsAtf", from, to] as const,
  insightsMore: (from: string, to: string) =>
    [...loansKeys.all, "insightsMore", from, to] as const,
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

export function loansInsightsAtfQueryOptions(from: string, to: string) {
  return queryOptions({
    queryKey: loansKeys.insightsAtf(from, to),
    staleTime: 45_000,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const data = await loansGraphQLRequest<{
        loansInsightsAtf: {
          range: { from: string; to: string };
          summary: {
            remainingMinor: unknown;
            monthlyObligationMinor: unknown;
            weightedAprBps: number | null;
            nextDueDate: string | null;
            loanCount: number;
          };
          remainingByLoan: Array<{
            id: string;
            label: string;
            valueMinor: unknown;
          }>;
          paidPrincipalMinor: unknown;
          paidInterestMinor: unknown;
        };
      }>(LOANS_INSIGHTS_ATF_QUERY, { from, to });
      const atf = data.loansInsightsAtf;
      return {
        range: atf.range,
        summary: {
          remainingMinor: gqlMinor(atf.summary.remainingMinor),
          monthlyObligationMinor: gqlMinor(atf.summary.monthlyObligationMinor),
          weightedAprBps: atf.summary.weightedAprBps,
          nextDueDate: atf.summary.nextDueDate,
          loanCount: atf.summary.loanCount,
        },
        remainingByLoan: atf.remainingByLoan.map((row) => ({
          id: row.id,
          label: row.label,
          valueMinor: gqlMinor(row.valueMinor),
        })),
        paidPrincipalMinor: gqlMinor(atf.paidPrincipalMinor),
        paidInterestMinor: gqlMinor(atf.paidInterestMinor),
      } satisfies LoansInsightsAtf;
    },
  });
}

export function loansInsightsMoreQueryOptions(from: string, to: string) {
  return queryOptions({
    queryKey: loansKeys.insightsMore(from, to),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const data = await loansGraphQLRequest<{
        loansInsightsMore: {
          remainingInterestMinor: unknown;
          ltvPct: number | null;
          progress: Array<{
            id: string;
            name: string;
            remainingMinor: unknown;
            percentComplete: number;
          }>;
          combinedChart: Array<{
            label: string;
            scheduledCumulativeMinor: unknown;
            actualCumulativeMinor: unknown;
            projectedCumulativeMinor: unknown;
          }>;
        };
      }>(LOANS_INSIGHTS_MORE_QUERY, { from, to });
      const more = data.loansInsightsMore;
      return {
        remainingInterestMinor: gqlMinor(more.remainingInterestMinor),
        ltvPct: more.ltvPct,
        progress: more.progress.map((row) => ({
          id: row.id,
          name: row.name,
          remainingMinor: gqlMinor(row.remainingMinor),
          percentComplete: row.percentComplete,
        })),
        combinedChart: more.combinedChart.map((row) => ({
          label: row.label,
          scheduledCumulativeMinor: gqlMinor(row.scheduledCumulativeMinor),
          actualCumulativeMinor: gqlMinor(row.actualCumulativeMinor),
          projectedCumulativeMinor: gqlMinor(row.projectedCumulativeMinor),
        })),
      } satisfies LoansInsightsMore;
    },
  });
}
