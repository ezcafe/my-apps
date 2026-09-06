import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
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
    <div className="border-b border-border/80 pb-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
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
  size = "lg",
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  return (
    <section id={id} className="scroll-mt-20 fx-fade-in space-y-4">
      <div className="border-b border-border/70 pb-3">
        <h2
          className={cn(
            "font-display font-semibold tracking-tight text-foreground",
            size === "xl" && "text-2xl sm:text-3xl leading-8",
            size === "lg" && "text-xl sm:text-2xl leading-7",
            size === "md" && "text-lg sm:text-xl leading-6",
          )}
        >
          {title}
        </h2>
        {description != null && description !== "" ? (
          <div className="mt-1 text-sm text-muted leading-relaxed">
            {typeof description === "string" ? <p>{description}</p> : description}
          </div>
        ) : null}
      </div>
      <div className="pt-1">{children}</div>
    </section>
  );
}
