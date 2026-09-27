import type { LoansInstallmentsQueryInput } from "@/lib/validators/loans";

export type LoansChartDrilldownPayload = {
  title: string;
  query: LoansInstallmentsQueryInput;
  openLoanId?: string;
};

export function loansDrilldownForLoanRemaining(input: {
  loanId: string;
  label: string;
}): LoansChartDrilldownPayload {
  return {
    title: `${input.label} · installments`,
    query: { loanId: input.loanId, limit: 50 },
    openLoanId: input.loanId,
  };
}

export function loansDrilldownForPaidInRange(input: {
  from: string;
  to: string;
  title?: string;
}): LoansChartDrilldownPayload {
  const from = input.from.slice(0, 10);
  const to = input.to.slice(0, 10);
  return {
    title: input.title ?? `Paid · ${from} → ${to}`,
    query: {
      from,
      to,
      status: "paid",
      limit: 50,
    },
  };
}

export function loansDrilldownForProgressPoint(input: {
  loanId?: string;
  label: string;
  from?: string;
  to?: string;
}): LoansChartDrilldownPayload {
  return {
    title: `Installment ${input.label}`,
    query: {
      loanId: input.loanId,
      from: input.from?.slice(0, 10),
      to: input.to?.slice(0, 10),
      limit: 50,
    },
    openLoanId: input.loanId,
  };
}
