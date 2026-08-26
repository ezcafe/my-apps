import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import {
  moneySectionPrimaryCta,
  type MoneySectionPrimaryCta,
} from "@/lib/money-section-primary-cta";

export type MoneyAppHeaderResolved = {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  cta: MoneySectionPrimaryCta | null;
  /** Detail pages should call useSetAppHeader for dynamic title/crumbs. */
  needsOverride?: boolean;
};

const SECTION_TABS: Array<{
  href: string;
  label: string;
  exact: boolean;
}> = [
  { href: "/money/insights", label: "Insights", exact: false },
  { href: "/money/new", label: "Add transaction", exact: true },
  { href: "/money", label: "Spending", exact: true },
  { href: "/money/bills", label: "Bills", exact: false },
  { href: "/money/savings", label: "Savings", exact: false },
  { href: "/money/import", label: "Import data", exact: false },
  { href: "/money/settings", label: "Money settings", exact: false },
];

const SETTINGS_CHILDREN: Array<{ segment: string; label: string }> = [
  { segment: "accounts", label: "Accounts" },
  { segment: "categories", label: "Categories" },
  { segment: "merchants", label: "Merchants" },
  { segment: "tags", label: "Tags" },
  { segment: "rules", label: "Rules" },
  { segment: "budgets", label: "Budgets" },
  { segment: "recurrence", label: "Recurrence" },
  { segment: "recurrency", label: "Recurrence" },
];

function isTabActive(pathname: string, href: string, exact: boolean): boolean {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function settingsChildLabel(pathname: string): string | null {
  if (!pathname.startsWith("/money/settings/")) return null;
  const rest = pathname.slice("/money/settings/".length).split("/")[0];
  if (!rest) return null;
  return SETTINGS_CHILDREN.find((c) => c.segment === rest)?.label ?? null;
}

/**
 * Pathname → page heading defaults (title, breadcrumbs, primary CTA).
 * Dynamic pages (transaction edit) set `needsOverride` and
 * should refine via {@link useSetAppHeader}.
 */
export function resolveMoneyAppHeader(
  pathname: string,
): MoneyAppHeaderResolved {
  const settingsLabel = settingsChildLabel(pathname);
  if (settingsLabel) {
    return {
      title: settingsLabel,
      breadcrumbs: [
        { label: "Settings", href: "/money/settings" },
        { label: settingsLabel },
      ],
      cta: null,
    };
  }

  if (/^\/money\/transactions\/[^/]+/.test(pathname)) {
    return {
      title: "Edit transaction",
      breadcrumbs: [],
      cta: null,
      needsOverride: true,
    };
  }

  const activeTab =
    SECTION_TABS.find(({ href, exact }) =>
      isTabActive(pathname, href, exact),
    ) ?? SECTION_TABS.find((t) => t.href === "/money");

  return {
    title: activeTab?.label ?? "Money",
    breadcrumbs: [],
    cta: moneySectionPrimaryCta(pathname),
  };
}
