"use client";

import type { ComponentPropsWithoutRef, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

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

function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
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

const nav = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/money", label: "Money", Icon: IconMoney },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

function navClasses(active: boolean, place: "rail" | "bar") {
  const rail =
    "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors";
  const bar =
    "rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 whitespace-nowrap";
  const base = place === "rail" ? rail : bar;
  const tone = active
    ? "bg-[color-mix(in_oklab,var(--foreground)_12%,transparent)] text-foreground"
    : "text-muted hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]";
  return `${base} ${tone}`;
}

function NavLink({
  href,
  label,
  place,
  Icon,
}: {
  href: string;
  label: string;
  place: "rail" | "bar";
  Icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  if (place === "rail") {
    return (
      <Link
        href={href}
        className={navClasses(active, "rail")}
        title={label}
        aria-label={label}
      >
        <Icon className="size-5" />
      </Link>
    );
  }
  return (
    <Link href={href} className={navClasses(active, "bar")}>
      {label}
    </Link>
  );
}

function AuthActions({
  className,
  compact,
  place = "bar",
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  compact?: boolean;
  place?: "bar" | "rail";
}) {
  const { data: session, status } = useSession();
  const btnPad = compact ? "px-2 py-2 text-xs" : "px-3 py-2 text-sm";

  if (place === "rail") {
    return (
      <div className={className} {...props}>
        {status === "authenticated" ? (
          <>
            <button
              type="button"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
              aria-label="Sign out"
              title={
                session?.user?.email
                  ? `Sign out (${session.user.email})`
                  : "Sign out"
              }
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <IconSignOut className="size-5" />
            </button>
            {session?.user?.email ? (
              <span className="sr-only">{`Signed in as ${session.user.email}`}</span>
            ) : null}
          </>
        ) : (
          <Link
            href="/login"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-colors hover:opacity-90"
            aria-label="Sign in"
            title="Sign in"
          >
            <IconSignIn className="size-5" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={className} {...props}>
      {status === "authenticated" ? (
        <button
          type="button"
          className={`rounded-lg border border-border hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] ${btnPad}`}
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      ) : (
        <Link
          href="/login"
          className={`rounded-lg bg-foreground text-center font-medium text-background hover:opacity-90 ${btnPad}`}
        >
          Sign in
        </Link>
      )}
      {session?.user?.email ? (
        <span
          className={`max-w-full truncate text-muted ${compact ? "max-w-[10rem] text-[10px] leading-tight sm:max-w-[14rem] sm:text-xs" : "text-xs"}`}
        >
          {session.user.email}
        </span>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)] bg-background text-foreground lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:grid-rows-1">
      {/* Small / tablet: full-width header + horizontal nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md lg:hidden">
        <div className="shell-main flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start">
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">
              Money
            </span>
          </div>
          <nav className="flex min-w-0 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-1 sm:flex-wrap sm:overflow-x-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {nav.map((item) => (
              <NavLink key={item.href} place="bar" {...item} />
            ))}
          </nav>
          <AuthActions className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3 sm:ms-auto sm:border-t-0 sm:pt-0" compact />
        </div>
      </header>

      {/* Large screens: full-width main + sticky narrow icon rail (Tailwind Plus multi-column) */}
      <aside className="hidden border-border bg-surface/80 backdrop-blur-sm lg:sticky lg:top-0 lg:flex lg:h-dvh lg:min-h-0 lg:w-full lg:max-w-full lg:flex-col lg:items-center lg:border-e lg:px-0 lg:py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold tracking-tight text-foreground ring-1 ring-border">
          M
        </span>
        <nav className="mt-4 flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink key={item.href} place="rail" {...item} />
          ))}
        </nav>
        <AuthActions
          className="mt-auto flex shrink-0 flex-col items-center gap-2 border-t border-border pt-3"
          place="rail"
        />
      </aside>

      <main className="min-h-0 min-w-0 lg:overflow-y-auto">{children}</main>
    </div>
  );
}
