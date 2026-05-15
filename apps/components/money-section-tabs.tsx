"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/money", label: "Transactions", exact: true as const },
  { href: "/money/analytics", label: "Analytics", exact: false as const },
  { href: "/money/import", label: "Import", exact: false as const },
  { href: "/money/settings", label: "Settings", exact: false as const },
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
      {tabs.map(({ href, label, exact }) => {
        const active = exact
          ? pathname === "/money"
          : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "fx-vt-money-tab-active border-accent text-foreground"
                : "border-transparent text-muted hover:border-border hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
