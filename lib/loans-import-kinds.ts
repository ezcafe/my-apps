export type LoansImportKind = "loans" | "installments";

/** Dependency order for Import all / Export all. */
export const LOANS_IMPORT_ALL_ORDER = [
  "loans",
  "installments",
] as const satisfies readonly LoansImportKind[];

const LOANS_IMPORT_KIND_LIST = ["loans", "installments"] as const;

export function isLoansImportKind(value: string): value is LoansImportKind {
  return (LOANS_IMPORT_KIND_LIST as readonly string[]).includes(value);
}

export const loansImportSectionTitle: Record<LoansImportKind, string> = {
  loans: "Loans",
  installments: "Installments",
};

export type LoansImportFieldDef = {
  key: string;
  label: string;
  required: boolean;
};

export function loansImportFieldDefs(kind: LoansImportKind): LoansImportFieldDef[] {
  switch (kind) {
    case "loans":
      return [
        { key: "name", label: "Name", required: true },
        { key: "currency", label: "Currency", required: false },
        { key: "principalMinor", label: "Principal (minor)", required: true },
        { key: "annualRateBps", label: "Annual rate (bps)", required: true },
        { key: "termMonths", label: "Term months", required: true },
        { key: "startDate", label: "Start date", required: true },
        { key: "dueDayOfMonth", label: "Due day of month", required: true },
        { key: "paymentMinor", label: "Payment (minor)", required: true },
        { key: "status", label: "Status", required: false },
      ];
    case "installments":
      return [
        { key: "loanId", label: "Loan id", required: true },
        { key: "installmentNumber", label: "Installment number", required: true },
        { key: "dueDate", label: "Due date", required: true },
        { key: "paymentMinor", label: "Payment (minor)", required: true },
        { key: "principalMinor", label: "Principal (minor)", required: true },
        { key: "interestMinor", label: "Interest (minor)", required: true },
        { key: "balanceAfterMinor", label: "Balance after (minor)", required: true },
        { key: "payStatus", label: "Pay status", required: false },
      ];
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}
