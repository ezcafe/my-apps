"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

type MoneySectionTabIconId = "new" | "transactions" | "analytics" | "import" | "settings";

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

function IconTransactions(props: SVGProps<SVGSVGElement>) {
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
  transactions: IconTransactions,
  analytics: IconAnalytics,
  import: IconImport,
  settings: IconSettings,
};

const tabs: Array<{
  href: string;
  label: string;
  icon: MoneySectionTabIconId;
  exact: boolean;
}> = [
  { href: "/money", label: "New", icon: "new", exact: true },
  { href: "/money/transactions", label: "Transactions", icon: "transactions", exact: false },
  { href: "/money/analytics", label: "Analytics", icon: "analytics", exact: false },
  { href: "/money/import", label: "Import", icon: "import", exact: false },
  { href: "/money/settings", label: "Settings", icon: "settings", exact: false },
];

/**
 * Route-driven section tabs for `/money/**`. Mirrors the visual language of
 * the radio-input `Tabs` primitive — underline + token colors — but each tab
 * is a `<Link>` that triggers a route change. The active link carries
 * `view-transition-name` so the underline glides between routes.
 */
export function MoneySectionTabs() {
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      aria-label="Money sections"
      className="flex min-w-0 flex-wrap gap-1 border-b border-border"
    >
      {tabs.map(({ href, label, icon, exact }) => {
        const active = exact
          ? pathname === "/money"
          : pathname === href || pathname.startsWith(`${href}/`);
        const Icon = moneySectionTabIcons[icon];

        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px flex items-center justify-center gap-1.5 border-b-2 px-2.5 py-2 transition-colors duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background max-md:fx-hit-40 md:px-3",
              active
                ? "fx-vt-money-tab-active border-accent text-foreground"
                : "border-transparent text-muted hover:border-border hover:text-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" />
            <span className="sr-only md:hidden">{label}</span>
            <span className="hidden text-sm font-medium md:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
