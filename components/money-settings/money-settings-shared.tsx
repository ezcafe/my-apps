import type { ReactNode } from "react";
import { AboutDisclosure } from "@/components/ui/about-disclosure";

/**
 * Shared settings chrome. Compose form controls from `components/ui/*`
 * (Field, Input, Select, Button) — do not reinvent inputs or buttons.
 * Children must not wrap content in another bordered+shadowed card;
 * use divide-y lists or flat bg-background inset rows with --radius-sm.
 * See `docs/DESIGN_GUIDE.md`.
 * Nested settings routes use layout PageHeading breadcrumbs — no in-body back link.
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

/** Flat section on the page background — heading + content, no Card chrome. */
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
    <section id={id} className="scroll-mt-24 fx-fade-in">
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
    </section>
  );
}
