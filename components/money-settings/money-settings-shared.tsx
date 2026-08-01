import Link from "next/link";
import type { ReactNode } from "react";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import { Card } from "@/components/ui/card";

/**
 * Shared settings chrome. Compose form controls from `components/ui/*`
 * (Field, Input, Select, Button) — do not reinvent inputs or buttons.
 * Children must not wrap content in another bordered+shadowed card;
 * use divide-y lists or flat bg-background inset rows with --radius-sm.
 * See `docs/DESIGN_GUIDE.md`.
 */

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
      <div className="flex min-w-0 items-center gap-1.5">
        <h3 className="font-display text-base font-semibold leading-6 text-foreground">
          {title}
        </h3>
        <AboutDisclosure label={`About ${title}`}>
          <p>{description}</p>
        </AboutDisclosure>
      </div>
    </div>
  );
}

/** Panel shell — single elevated Card surface. */
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
    <Card id={id} className="scroll-mt-24 fx-fade-in">
      <div className="p-5">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="font-display text-base font-semibold leading-6 text-foreground">
            {title}
          </h2>
          {description != null && description !== "" ? (
            <AboutDisclosure label={`About ${title}`}>
              {typeof description === "string" ? (
                <p>{description}</p>
              ) : (
                description
              )}
            </AboutDisclosure>
          ) : null}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </Card>
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
