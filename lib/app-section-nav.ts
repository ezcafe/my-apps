import type { MoneyOptionalSectionTabKey } from "@/lib/money-section-tab-visibility";

/** Product areas reachable from the in-page hamburger. */
export type AppSectionKey = "money" | "investments" | "loans";

/** Task-oriented groups within an app (P&P long-nav mental model). */
export type AppNavGroup = "review" | "capture" | "browse" | "configure";

export type AppSectionTabIconId =
  | "new"
  | "analytics"
  | "spending"
  | "bills"
  | "savings"
  | "loans"
  | "investments"
  | "instruments"
  | "import"
  | "settings";

export type AppSectionNavItem = {
  href: string;
  label: string;
  icon: AppSectionTabIconId;
  exact: boolean;
  group: AppNavGroup;
  /** When set, item is hidden unless enabled in Money settings. */
  visibilityKey?: MoneyOptionalSectionTabKey;
};

export type AppSectionNavConfig = {
  label: string;
  homeHref: string;
  matchPrefix: string;
  items: AppSectionNavItem[];
};

export const APP_NAV_GROUP_LABELS: Record<AppNavGroup, string> = {
  review: "Review",
  capture: "Capture",
  browse: "Browse",
  configure: "Configure",
};

export const APP_NAV_GROUP_ORDER: AppNavGroup[] = [
  "browse",
  "review",
  "capture",
  "configure",
];

export const APP_SECTION_ORDER: AppSectionKey[] = [
  "money",
  "investments",
  "loans",
];

export const APP_SECTION_NAV: Record<AppSectionKey, AppSectionNavConfig> = {
  money: {
    label: "Money",
    homeHref: "/money",
    matchPrefix: "/money",
    items: [
      {
        href: "/money",
        label: "Spending",
        icon: "spending",
        exact: true,
        group: "browse",
      },
      {
        href: "/money/insights",
        label: "Insights",
        icon: "analytics",
        exact: false,
        group: "review",
      },
      {
        href: "/money/new",
        label: "Add transaction",
        icon: "new",
        exact: true,
        group: "capture",
      },
      {
        href: "/money/bills",
        label: "Bills",
        icon: "bills",
        exact: false,
        group: "browse",
        visibilityKey: "bills",
      },
      {
        href: "/money/savings",
        label: "Savings",
        icon: "savings",
        exact: false,
        group: "browse",
        visibilityKey: "savings",
      },
      {
        href: "/money/import",
        label: "Import",
        icon: "import",
        exact: false,
        group: "configure",
        visibilityKey: "import",
      },
      {
        href: "/money/settings",
        label: "Settings",
        icon: "settings",
        exact: false,
        group: "configure",
      },
    ],
  },
  investments: {
    label: "Investments",
    homeHref: "/investments",
    matchPrefix: "/investments",
    items: [
      {
        href: "/investments",
        label: "Investments",
        icon: "investments",
        exact: true,
        group: "browse",
      },
      {
        href: "/investments/insights",
        label: "Insights",
        icon: "analytics",
        exact: false,
        group: "review",
      },
      {
        href: "/investments/new",
        label: "Record activity",
        icon: "new",
        exact: false,
        group: "capture",
      },
      {
        href: "/investments/instruments",
        label: "Instruments",
        icon: "instruments",
        exact: false,
        group: "browse",
      },
      {
        href: "/investments/settings",
        label: "Settings",
        icon: "settings",
        exact: false,
        group: "configure",
      },
    ],
  },
  loans: {
    label: "Loans",
    homeHref: "/loans",
    matchPrefix: "/loans",
    items: [
      {
        href: "/loans",
        label: "Loans",
        icon: "loans",
        exact: true,
        group: "browse",
      },
      {
        href: "/loans/insights",
        label: "Insights",
        icon: "analytics",
        exact: false,
        group: "review",
      },
      {
        href: "/loans/new",
        label: "Create loan",
        icon: "new",
        exact: false,
        group: "capture",
      },
      {
        href: "/loans/settings",
        label: "Settings",
        icon: "settings",
        exact: false,
        group: "configure",
      },
    ],
  },
};

/** Active app for context-first menu chrome, or `null` on Help / Settings. */
export function resolveAppSectionFromPath(pathname: string): AppSectionKey | null {
  if (pathname === "/investments" || pathname.startsWith("/investments/")) {
    return "investments";
  }
  if (pathname === "/loans" || pathname.startsWith("/loans/")) {
    return "loans";
  }
  if (pathname === "/money" || pathname.startsWith("/money/")) {
    return "money";
  }
  return null;
}

export function isAppSectionNavItemActive(
  pathname: string,
  href: string,
  exact: boolean,
): boolean {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function visibleAppSectionItems(
  app: AppSectionKey,
  isTabVisible: (key: MoneyOptionalSectionTabKey | undefined) => boolean,
): AppSectionNavItem[] {
  return APP_SECTION_NAV[app].items.filter(
    (item) =>
      item.visibilityKey == null || isTabVisible(item.visibilityKey),
  );
}

export function appSectionItemsByGroup(
  items: AppSectionNavItem[],
): Array<{ group: AppNavGroup; items: AppSectionNavItem[] }> {
  return APP_NAV_GROUP_ORDER.flatMap((group) => {
    const grouped = items.filter((item) => item.group === group);
    return grouped.length > 0 ? [{ group, items: grouped }] : [];
  });
}
