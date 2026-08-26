"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, type ReactNode, type SVGProps } from "react";
import { useAppHeaderOverride } from "@/components/app-header-override";
import { PageHeading } from "@/components/page-heading";
import { Popover } from "@/components/ui/popover";
import { buttonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import {
  isShellNavActive,
  shellNavItems,
  type ShellNavIconId,
  type ShellNavItem,
} from "@/lib/features/registry";
import { resolveMoneyAppHeader } from "@/lib/money-app-header";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import type { MoneyOptionalSectionTabKey } from "@/lib/money-section-tab-visibility";
import { useMoneyMenuPageActions } from "@/lib/money-menu-page-actions";

type MoneySectionTabIconId =
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

function IconMenu(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

function IconInstruments(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V4a2 2 0 0 1 2-2h8l8.59 8.59a2 2 0 0 1 0 2.82Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
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

function IconHelp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHome(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMoney(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 10h18M7 15h2m2 0h2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSignIn(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSignOut(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
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
  instruments: IconInstruments,
  import: IconImport,
  settings: IconSettings,
};

const shellMenuIcons: Record<
  ShellNavIconId,
  (props: SVGProps<SVGSVGElement>) => ReactNode
> = {
  home: IconHome,
  money: IconMoney,
  savings: IconSavings,
  investment: IconInvestments,
  loans: IconLoans,
  help: IconHelp,
  settings: IconSettings,
};

const menuItemClassName = (active: boolean) =>
  cn(
    "flex min-h-10 items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    active
      ? "bg-muted-surface text-foreground"
      : "text-muted hover:bg-muted-surface hover:text-foreground",
  );

const menuIconButtonClassName = (active: boolean) =>
  cn(
    "fx-hit-40 inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    active
      ? "bg-muted-surface text-foreground"
      : "text-muted hover:bg-muted-surface hover:text-foreground",
  );

const tabs: Array<{
  href: string;
  label: string;
  icon: MoneySectionTabIconId;
  exact: boolean;
  /** When set, tab is hidden unless user enabled it in Settings. */
  visibilityKey?: MoneyOptionalSectionTabKey;
}> = [
  { href: "/money/insights", label: "Insights", icon: "analytics", exact: false },
  { href: "/money/new", label: "Add transaction", icon: "new", exact: true },
  { href: "/money", label: "Spending", icon: "spending", exact: true },
  {
    href: "/money/bills",
    label: "Bills",
    icon: "bills",
    exact: false,
    visibilityKey: "bills",
  },
  {
    href: "/money/savings",
    label: "Savings",
    icon: "savings",
    exact: false,
    visibilityKey: "savings",
  },
  {
    href: "/money/import",
    label: "Import data",
    icon: "import",
    exact: false,
    visibilityKey: "import",
  },
  {
    href: "/money/settings",
    label: "Money settings",
    icon: "settings",
    exact: false,
  },
];

const investmentTabs: Array<{
  href: string;
  label: string;
  icon: MoneySectionTabIconId;
  exact: boolean;
}> = [
  { href: "/investments", label: "Overview", icon: "investments", exact: true },
  {
    href: "/investments/insights",
    label: "Insights",
    icon: "analytics",
    exact: false,
  },
  {
    href: "/investments/new",
    label: "Record activity",
    icon: "new",
    exact: false,
  },
  {
    href: "/investments/instruments",
    label: "Instruments",
    icon: "instruments",
    exact: false,
  },
];

const loanTabs: Array<{
  href: string;
  label: string;
  icon: MoneySectionTabIconId;
  exact: boolean;
}> = [
  { href: "/loans", label: "Overview", icon: "loans", exact: true },
  {
    href: "/loans/insights",
    label: "Insights",
    icon: "analytics",
    exact: false,
  },
  {
    href: "/loans/new",
    label: "Create loan",
    icon: "new",
    exact: false,
  },
  {
    href: "/loans/settings",
    label: "Loans settings",
    icon: "settings",
    exact: false,
  },
];

/** Shell/core items shown under the Money sections (skip Money itself). */
const moneyMenuShellItems: ShellNavItem[] = shellNavItems.filter(
  (item) => item.kind === "core",
);

function isTabActive(
  pathname: string,
  href: string,
  exact: boolean,
): boolean {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function MenuSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-0.5 pt-2 text-xs font-semibold tracking-wide text-muted first:pt-0">
      {children}
    </p>
  );
}

function MoneyAppMenuNavLink({
  href,
  label,
  icon,
  exact,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: MoneySectionTabIconId;
  exact: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = isTabActive(pathname, href, exact);
  const Icon = moneySectionTabIcons[icon];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={menuItemClassName(active)}
    >
      <Icon className="size-5 shrink-0" />
      {label}
    </Link>
  );
}

function MoneyMenuShellLink({
  item,
  onNavigate,
}: {
  item: ShellNavItem;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = isShellNavActive(item, pathname);
  const Icon = shellMenuIcons[item.icon];

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={menuIconButtonClassName(active)}
    >
      <Icon className="size-5 shrink-0" />
    </Link>
  );
}

function MoneyMenuAuth({ onNavigate }: { onNavigate: () => void }) {
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <button
        type="button"
        title="Sign out"
        aria-label="Sign out"
        className={menuIconButtonClassName(false)}
        onClick={() => {
          onNavigate();
          signOut({ redirectTo: "/login" });
        }}
      >
        <IconSignOut className="size-5 shrink-0" />
      </button>
    );
  }

  return (
    <Link
      href="/login"
      onClick={onNavigate}
      title="Sign in"
      aria-label="Sign in"
      className={menuIconButtonClassName(false)}
    >
      <IconSignIn className="size-5 shrink-0" />
    </Link>
  );
}

/**
 * Flat Money, Investments, and Loans hamburger (icon-only trigger).
 * All section links render on the first panel; page actions sit at the top when registered.
 */
export function MoneyAppMenu() {
  const pathname = usePathname();
  const pageActions = useMoneyMenuPageActions();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);

  if (pathname !== menuPath) {
    setMenuPath(pathname);
    if (open) setOpen(false);
  }

  const close = () => setOpen(false);

  return (
    <Popover
      align="start"
      aria-label="Open navigation menu"
      open={open}
      onOpenChange={setOpen}
      trigger={<IconMenu className="size-5" />}
      triggerClassName="fx-hit-40 size-10 shrink-0 p-0"
      className="flex max-h-[min(70dvh,calc(100dvh-6rem))] min-w-[min(100vw-2rem,18rem)] flex-col p-1.5"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {pageActions.length > 0 ? (
          <>
            <div className="flex flex-col" role="group" aria-label="Page actions">
              {pageActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={cn(
                    menuItemClassName(false),
                    "w-full text-left",
                    action.variant === "danger" &&
                      "text-[var(--destructive-muted-text)] hover:bg-[var(--destructive-muted-bg)] hover:text-[var(--destructive-muted-text)]",
                  )}
                  onClick={() => {
                    close();
                    action.onSelect();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <div
              role="separator"
              aria-hidden
              className="my-1.5 border-t border-border"
            />
          </>
        ) : null}

        <nav className="flex flex-col" aria-label="Money sections">
          <MenuSectionLabel>Money</MenuSectionLabel>
          {tabs.map(({ href, label, icon, exact }) => (
            <MoneyAppMenuNavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              exact={exact}
              onNavigate={close}
            />
          ))}
        </nav>

        <nav className="flex flex-col" aria-label="Investments sections">
          <MenuSectionLabel>Investments</MenuSectionLabel>
          {investmentTabs.map(({ href, label, icon, exact }) => (
            <MoneyAppMenuNavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              exact={exact}
              onNavigate={close}
            />
          ))}
        </nav>

        <nav className="flex flex-col" aria-label="Loans sections">
          <MenuSectionLabel>Loans</MenuSectionLabel>
          {loanTabs.map(({ href, label, icon, exact }) => (
            <MoneyAppMenuNavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              exact={exact}
              onNavigate={close}
            />
          ))}
        </nav>
      </div>

      <div
        role="separator"
        aria-hidden
        className="my-1.5 shrink-0 border-t border-border"
      />

      <nav
        className="flex shrink-0 items-center justify-between gap-1"
        aria-label="Workspace"
      >
        {moneyMenuShellItems.map((item) => (
          <MoneyMenuShellLink
            key={item.id}
            item={item}
            onNavigate={close}
          />
        ))}
        <MoneyMenuAuth onNavigate={close} />
      </nav>
    </Popover>
  );
}

/**
 * Unified Money page heading (Tailwind Plus + {@link MoneyAppMenu}).
 * Detail pages refine title/crumbs via {@link useSetAppHeader}.
 */
export function MoneySectionTabs() {
  const pathname = usePathname();
  const override = useAppHeaderOverride();
  const resolved = resolveMoneyAppHeader(pathname);

  const title = override?.title ?? resolved.title;
  const breadcrumbs =
    override?.breadcrumbs ?? resolved.breadcrumbs;
  const description = override?.description;
  const cta =
    override != null && "cta" in override
      ? override.cta ?? null
      : resolved.cta;

  return (
    <PageHeading
      className={MONEY_FULL_SPAN}
      leading={<MoneyAppMenu />}
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      actions={
        cta ? (
          <Link
            href={cta.href}
            className={buttonClassName({
              variant: "primary",
              className: "shrink-0",
            })}
          >
            {cta.label}
          </Link>
        ) : null
      }
    />
  );
}

/** Loading placeholder matching {@link MoneySectionTabs} (icon menu + optional title). */
export function MoneySectionChromeSkeleton({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  return (
    <div
      className={cn(MONEY_FULL_SPAN, "flex items-center gap-3")}
      aria-hidden
    >
      <Skeleton className="size-10 shrink-0 rounded-[var(--radius-md)]" />
      {showTitle ? (
        <Skeleton className="h-7 min-w-0 flex-1 max-w-[12rem] rounded-[var(--radius-sm)] sm:h-8 sm:max-w-[14rem]" />
      ) : null}
    </div>
  );
}
