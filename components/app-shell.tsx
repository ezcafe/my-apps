"use client";

import type { ReactNode, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { MoneyAppMenu } from "@/components/money-section-tabs";
import {
  isShellNavActive,
  type ShellNavIconId,
  type ShellNavItem,
  shellNavItems,
} from "@/lib/features/registry";
import { cn } from "@/lib/cn";
import { hidesShellRailChrome } from "@/lib/money-tabs-chrome-path";

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

function IconLoans(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4 19V5M4 5h16M20 19H4M8 15h8M8 11h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSavings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 3v18M7 8c0-2.2 2.2-4 5-4s5 1.8 5 4-2.2 4-5 4-5-1.8-5-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconInvestment(props: SVGProps<SVGSVGElement>) {
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

const shellNavIcons: Record<
  ShellNavIconId,
  (props: SVGProps<SVGSVGElement>) => ReactNode
> = {
  home: IconHome,
  money: IconMoney,
  savings: IconSavings,
  investment: IconInvestment,
  loans: IconLoans,
  help: IconHelp,
  settings: IconSettings,
};

function NavLinkRail({
  item,
}: {
  item: ShellNavItem;
}) {
  const pathname = usePathname();
  const active = isShellNavActive(item, pathname);
  const Icon = shellNavIcons[item.icon];
  const href = item.href;
  const label = item.label;

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-colors duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "fx-vt-shell-nav-active bg-muted-surface text-foreground ring-1 ring-border"
          : "text-muted hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] hover:text-foreground",
      )}
    >
      <Icon className="size-5" />
    </Link>
  );
}

function AuthActionsRail() {
  const { data: session, status } = useSession();

  if (status === "authenticated") {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          iconOnly
          className="size-10 shrink-0"
          aria-label={
            session?.user?.email ? `Sign out (${session.user.email})` : "Sign out"
          }
          title={
            session?.user?.email ? `Sign out (${session.user.email})` : "Sign out"
          }
          onClick={() => signOut({ redirectTo: "/login" })}
        >
          <IconSignOut className="size-5" />
        </Button>
        {session?.user?.email ? (
          <span className="sr-only">{`Signed in as ${session.user.email}`}</span>
        ) : null}
      </>
    );
  }

  return (
    <Link
      href="/login"
      aria-label="Sign in"
      title="Sign in"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent text-accent-foreground shadow-[var(--shadow-sm)] transition-[opacity,transform] duration-200 hover:opacity-90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
      )}
    >
      <IconSignIn className="size-5" />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideShellRail = hidesShellRailChrome(pathname);
  const showShellMobileMenu = !hideShellRail;
  const showShellAside = !hideShellRail;

  return (
    <div
      className={cn(
        "grid min-h-dvh grid-cols-1 bg-background text-foreground",
        showShellAside
          ? "lg:grid-cols-[4.5rem_minmax(0,1fr)]"
          : "lg:grid-cols-1",
      )}
    >
      {showShellMobileMenu ? (
        <div
          className="pointer-events-none fixed z-30 lg:hidden"
          style={{
            top: "max(0.75rem, env(safe-area-inset-top))",
            left: "max(0.75rem, env(safe-area-inset-left))",
          }}
        >
          <div className="pointer-events-auto">
            <MoneyAppMenu />
          </div>
        </div>
      ) : null}

      {showShellAside ? (
        <aside className="hidden border-border bg-surface/80 backdrop-blur-sm lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-full lg:max-w-full lg:flex-col lg:items-center lg:border-e lg:px-0 lg:py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] font-display text-sm font-semibold tracking-tight text-foreground ring-1 ring-border">
            W
          </span>
          <nav
            className="mt-4 flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto"
            aria-label="Primary"
          >
            {shellNavItems.map((item) => (
              <NavLinkRail key={item.id} item={item} />
            ))}
          </nav>
          <div className="mt-auto flex shrink-0 flex-col items-center gap-2 border-t border-border pt-3">
            <AuthActionsRail />
          </div>
        </aside>
      ) : null}

      <main className="min-h-0 min-w-0">
        {children}
      </main>
    </div>
  );
}
