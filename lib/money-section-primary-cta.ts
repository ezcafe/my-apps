import {
  MONEY_LEDGER_BILLS,
  MONEY_LEDGER_SAVINGS,
  MONEY_LEDGER_SPENDING,
} from "@/lib/money-ledger-presets";

export type MoneySectionPrimaryCta = {
  href: string;
  label: string;
};

const DEFAULT_CTA: MoneySectionPrimaryCta = {
  href: "/money/new",
  label: "Add transaction",
};

/** Create/edit form routes — header already is the “add” surface. */
function isMoneyCreateFormPath(pathname: string): boolean {
  return (
    pathname === "/money/new" ||
    pathname.startsWith("/money/new/")
  );
}

function isMoneySettingsChildPath(pathname: string): boolean {
  return (
    pathname.startsWith("/money/settings/") &&
    pathname !== "/money/settings/"
  );
}

/**
 * Primary add CTA for the Money section header, by route.
 * Labels match ledger empty-state actions.
 * No CTA on create forms, module settings, or settings children.
 */
export function moneySectionPrimaryCta(
  pathname: string,
): MoneySectionPrimaryCta | null {
  if (isMoneyCreateFormPath(pathname)) return null;
  if (isMoneySettingsChildPath(pathname)) return null;
  if (/^\/money\/transactions\/[^/]+/.test(pathname)) return null;

  if (pathname === "/money/bills" || pathname.startsWith("/money/bills/")) {
    return MONEY_LEDGER_BILLS.emptyState.primaryAction ?? DEFAULT_CTA;
  }
  if (pathname === "/money/savings" || pathname.startsWith("/money/savings/")) {
    return MONEY_LEDGER_SAVINGS.emptyState.primaryAction ?? DEFAULT_CTA;
  }
  if (
    pathname === "/money" ||
    pathname === "/money/" ||
    pathname === "/money/spending" ||
    pathname.startsWith("/money/spending/")
  ) {
    return MONEY_LEDGER_SPENDING.emptyState.primaryAction ?? DEFAULT_CTA;
  }

  // Insights, settings hub, import, and other Money chrome routes.
  return DEFAULT_CTA;
}
