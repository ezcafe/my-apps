"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";
import {
  useMoneySectionTabVisibility,
  type MoneyOptionalSectionTabKey,
} from "@/lib/money-section-tab-visibility";

type MoneySectionTabIconId =
  | "new"
  | "analytics"
  | "spending"
  | "bills"
  | "savings"
  | "loans"
  | "investments"
  | "import"
  | "settings";

function IconNew(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAnalytics(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4 19V5M10 19V9M16 19v-6M22 19V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSpending(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBills(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M6 2h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V4a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 7h8M8 11h8M8 15h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSavings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M19 11c0 5-7 9-7 9s-7-4-7-9a7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 11v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLoans(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconInvestments(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M3 17l6-6 4 4 8-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 5h4v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconImport(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const moneySectionTabIcons: Record<
  MoneySectionTabIconId,
  (props: SVGProps<SVGSVGElement>) => ReactNode
> = {
  new: IconNew,
  analytics: IconAnalytics,
  spending: IconSpending,
  bills: IconBills,
  savings: IconSavings,
  loans: IconLoans,
  investments: IconInvestments,
  import: IconImport,
  settings: IconSettings,
};

const CHART_DOT = [
  "bg-chart-0",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-6",
  "bg-chart-7",
] as const;

const tabs: Array<{
  href: string;
  label: string;
  icon: MoneySectionTabIconId;
  exact: boolean;
  accentIndex: number;
  /** When set, tab is hidden unless user enabled it in Settings. */
  visibilityKey?: MoneyOptionalSectionTabKey;
}> = [
  { href: "/money", label: "New", icon: "new", exact: true, accentIndex: 0 },
  { href: "/money/analytics", label: "Analytics", icon: "analytics", exact: false, accentIndex: 1 },
  { href: "/money/spending", label: "Spending", icon: "spending", exact: false, accentIndex: 0 },
  { href: "/money/bills", label: "Bills", icon: "bills", exact: false, accentIndex: 5, visibilityKey: "bills" },
  { href: "/money/savings", label: "Savings", icon: "savings", exact: false, accentIndex: 3, visibilityKey: "savings" },
  { href: "/money/loans", label: "Loans", icon: "loans", exact: false, accentIndex: 6, visibilityKey: "loans" },
  { href: "/money/investments", label: "Invest", icon: "investments", exact: false, accentIndex: 4, visibilityKey: "investments" },
  { href: "/money/import", label: "Import", icon: "import", exact: false, accentIndex: 2, visibilityKey: "import" },
  { href: "/money/settings", label: "Settings", icon: "settings", exact: false, accentIndex: 7 },
];

/**
 * Route-driven section tabs for `/money/**`. Mirrors the visual language of
 * the radio-input `Tabs` primitive — underline + token colors — but each tab
 * is a `<Link>` that triggers a route change. The active link carries
 * `view-transition-name` so the underline glides between routes.
 */
export function MoneySectionTabs() {
  const pathname = usePathname();
  const { isTabVisible } = useMoneySectionTabVisibility();

  return (
    <nav
      role="tablist"
      aria-label="Money sections"
      className="-mx-1 flex min-w-0 gap-0.5 overflow-x-auto border-b border-border px-1 pb-px [scrollbar-width:thin]"
    >
      {tabs
        .filter(({ visibilityKey }) => isTabVisible(visibilityKey))
        .map(({ href, label, icon, exact, accentIndex }) => {
          const active = exact
            ? pathname === "/money"
            : pathname === href || pathname.startsWith(`${href}/`);
          const Icon = moneySectionTabIcons[icon];
          const dotClass = CHART_DOT[accentIndex] ?? CHART_DOT[0];

          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-[3.25rem] shrink-0 snap-start flex-col items-center gap-0.5 border-b-2 px-2 py-2 transition-colors duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-hit-40 md:min-w-0 md:flex-row md:gap-1.5 md:px-3",
                active
                  ? "fx-vt-money-tab-active border-accent text-foreground"
                  : "border-transparent text-muted hover:border-border hover:text-foreground",
              )}
            >
              <span className="relative">
                <Icon className="size-5 shrink-0" />
                <span
                  className={cn(
                    "absolute -end-0.5 -top-0.5 size-1.5 rounded-full ring-1 ring-background md:hidden",
                    dotClass,
                  )}
                  aria-hidden
                />
              </span>
              <span className="max-w-[4.5rem] truncate text-[10px] font-medium leading-tight md:hidden">
                {label}
              </span>
              <span className="hidden text-sm font-medium md:inline">{label}</span>
            </Link>
          );
        })}
    </nav>
  );
}
