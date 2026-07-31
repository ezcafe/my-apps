import Link from "next/link";
import type { ReactNode } from "react";
import { AboutDisclosure } from "@/components/ui/about-disclosure";

/**
 * Shared class strings for money-settings panels. All values are token-driven
 * so they switch radius/shadow/border with the active visual style preset.
 * See `docs/DESIGN_GUIDE.md` for usage rules.
 */

export const inputCls =
  "w-full min-w-0 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground antialiased outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

export const secondaryBtnCls =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-sm)] transition-[opacity,transform,box-shadow] duration-200 hover:bg-muted-surface focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 fx-press";

export const primaryBtnCls =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-[var(--shadow-sm)] transition-[opacity,transform,box-shadow] duration-200 hover:opacity-95 active:opacity-90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 fx-press";

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
      <h3 className="font-display text-base font-semibold leading-6 text-foreground">
        {title}
      </h3>
      <AboutDisclosure>
        <p>{description}</p>
      </AboutDisclosure>
    </div>
  );
}

/** Panel shell — token-driven radius and shadow. */
export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-sm)] fx-fade-in"
    >
      <div className="p-5">
        <h2 className="font-display text-base font-semibold leading-6 text-foreground">
          {title}
        </h2>
        {description != null && description !== "" ? (
          <AboutDisclosure>
            {typeof description === "string" ? (
              <p>{description}</p>
            ) : (
              description
            )}
          </AboutDisclosure>
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
            className="rounded-[var(--radius-sm)] px-1 py-0.5 text-foreground transition-colors duration-150 hover:bg-muted-surface"
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
