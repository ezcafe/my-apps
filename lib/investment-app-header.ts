import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";

export type InvestmentAppHeaderResolved = {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  cta: { href: string; label: string } | null;
  meta?: string;
};

const RECORD_CTA = MONEY_LEDGER_INVESTMENT.emptyState.primaryAction ?? {
  href: "/investments/new",
  label: "Record activity",
};

/**
 * Pathname → page heading defaults for `/investments`.
 */
export function resolveInvestmentAppHeader(
  pathname: string,
): InvestmentAppHeaderResolved {
  if (
    pathname === "/investments/insights" ||
    pathname.startsWith("/investments/insights/")
  ) {
    return {
      title: "Insights",
      breadcrumbs: [],
      cta: null,
      meta: "Portfolio performance and trade results for the selected range.",
    };
  }

  if (
    pathname === "/investments/new" ||
    pathname.startsWith("/investments/new/")
  ) {
    return {
      title: "Record activity",
      breadcrumbs: [
        { label: "Investments", href: "/investments" },
        { label: "Record activity" },
      ],
      cta: null,
      meta: "Record trades and close open positions. Cash and P&L post to your Money investment account.",
    };
  }

  if (
    pathname === "/investments/settings/import" ||
    pathname.startsWith("/investments/settings/import/")
  ) {
    return {
      title: "Import statement",
      breadcrumbs: [
        { label: "Investments", href: "/investments" },
        { label: "Settings", href: "/investments/settings" },
        { label: "Import statement" },
      ],
      cta: null,
      meta: "Import broker and exchange statements into Investment activities.",
    };
  }

  if (
    pathname === "/investments/settings" ||
    pathname.startsWith("/investments/settings/")
  ) {
    return {
      title: "Investments settings",
      breadcrumbs: [
        { label: "Investments", href: "/investments" },
        { label: "Settings" },
      ],
      cta: null,
      meta: "Manage statement import, instruments, and ledger defaults.",
    };
  }

  if (
    pathname === "/investments/instruments/new" ||
    pathname.startsWith("/investments/instruments/new/")
  ) {
    return {
      title: "Create instrument",
      breadcrumbs: [
        { label: "Investments", href: "/investments" },
        { label: "Instruments", href: "/investments/instruments" },
        { label: "Create instrument" },
      ],
      cta: null,
    };
  }

  if (
    pathname === "/investments/instruments" ||
    pathname.startsWith("/investments/instruments/")
  ) {
    return {
      title: "Instruments",
      breadcrumbs: [
        { label: "Investments", href: "/investments" },
        { label: "Instruments" },
      ],
      cta: {
        href: "/investments/instruments/new",
        label: "Create instrument",
      },
      meta: "Symbols, contract sizes, and quote mappings for your trades.",
    };
  }

  return {
    title: "Investments",
    breadcrumbs: [],
    cta: RECORD_CTA,
    meta: MONEY_LEDGER_INVESTMENT.description,
  };
}
