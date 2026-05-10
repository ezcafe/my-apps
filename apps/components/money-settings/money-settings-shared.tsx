import Link from "next/link";
import type { ReactNode } from "react";

export const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm w-full min-w-0";

export const secondaryBtnCls =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)] transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] disabled:pointer-events-none disabled:opacity-40";

export const primaryBtnCls =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90";

/** Application-style section heading (Tailwind Plus “section headings” pattern). */
export function SettingsSubsectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border pb-5">
      <h3 className="text-base font-semibold leading-6 text-foreground">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

/** Panel shell aligned with the main Money dashboard (`rounded-md border … bg-surface p-4`). */
export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-md border border-border bg-surface"
    >
      <div className="p-4">
        <h2 className="text-base font-semibold leading-6 text-foreground">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
        ) : null}
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

export function MoneySettingsBackLink({ current }: { current: string }) {
  return (
    <nav className="mb-6" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <li>
          <Link
            href="/money/settings"
            className="rounded px-1 py-0.5 text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
          >
            Settings
          </Link>
        </li>
        <li className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className="size-4 text-muted"
          >
            <path
              fillRule="evenodd"
              d="M7.28 14.78a.75.75 0 0 1 0-1.06L11 10 7.28 6.28a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium text-foreground" aria-current="page">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
