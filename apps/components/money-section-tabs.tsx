"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/money", label: "Transactions", exact: true as const },
  { href: "/money/analytics", label: "Analytics", exact: false as const },
  { href: "/money/import", label: "Import", exact: false as const },
  { href: "/money/settings", label: "Settings", exact: false as const },
];

export function MoneySectionTabs() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border" aria-label="Money sections">
      <ul className="-mb-px flex flex-wrap gap-x-6 gap-y-1">
        {tabs.map(({ href, label, exact }) => {
          const active = exact
            ? pathname === "/money"
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                className={
                  active
                    ? "inline-flex border-b-2 border-foreground px-1 pb-3 text-sm font-semibold text-foreground"
                    : "inline-flex border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-muted transition-colors hover:border-border hover:text-foreground"
                }
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
