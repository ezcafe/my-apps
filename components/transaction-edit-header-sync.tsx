"use client";

import { useSetAppHeader } from "@/components/app-header-override";

function resolveTransactionEditReturnTo(raw: string | null | undefined): string {
  if (
    raw === "/money/spending" ||
    raw === "/money/transactions" ||
    raw === "/money/bills" ||
    raw === "/money/savings" ||
    raw === "/money/investments" ||
    raw === "/money/loans" ||
    raw === "/money/analytics"
  ) {
    return raw === "/money/transactions" ? "/money/spending" : raw;
  }
  return "/money/spending";
}

function transactionEditReturnLabel(returnTo: string): string {
  if (returnTo === "/money/spending" || returnTo === "/money/transactions") {
    return "Spending";
  }
  if (returnTo === "/money/bills") return "Bills";
  if (returnTo === "/money/savings") return "Savings";
  if (returnTo === "/money/investments") return "Investments";
  if (returnTo === "/money/loans") return "Loans";
  return "Insights";
}

const TX_EDIT_ABOUT = "Update fields for this workspace transaction.";

/** Syncs layout PageHeading for the transaction edit page. */
export function TransactionEditHeaderSync({
  returnTo: returnToProp,
}: {
  returnTo?: string | null;
}) {
  const returnTo = resolveTransactionEditReturnTo(returnToProp);
  const parentLabel = transactionEditReturnLabel(returnTo);

  useSetAppHeader({
    title: "Edit transaction",
    description: TX_EDIT_ABOUT,
    breadcrumbs: [
      { label: parentLabel, href: returnTo },
      { label: "Edit transaction" },
    ],
    cta: null,
  });

  return null;
}
