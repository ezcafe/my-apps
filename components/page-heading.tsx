import type { ReactNode } from "react";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import {
  Breadcrumb,
  type BreadcrumbItem,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/cn";

/**
 * Application page heading — Tailwind Plus “With actions” /
 * “With actions and breadcrumbs” / “With meta and actions”, clean-minimal tokens.
 * @see https://tailwindcss.com/plus/ui-blocks/application-ui/headings/page-headings
 *
 * Layout deviation: title + leading + actions stay on one row at all widths
 * so the primary CTA remains in the header on phones.
 */
export function PageHeading({
  title,
  description,
  meta,
  leading,
  actions,
  breadcrumbs,
  className,
}: {
  title: string;
  /** AboutDisclosure body (info icon beside the title). */
  description?: ReactNode;
  /** Optional subtitle under the title row (Plus meta slot). */
  meta?: ReactNode;
  /** Optional control before the title (e.g. Money menu). */
  leading?: ReactNode;
  actions?: ReactNode;
  /** Plus breadcrumbs row above the title when nested. */
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}) {
  const hasCrumbs = breadcrumbs != null && breadcrumbs.length > 0;

  return (
    <header
      className={cn(
        "relative z-40 flex flex-col gap-2 border-b border-border pb-5",
        className,
      )}
    >
      {hasCrumbs ? <Breadcrumb items={breadcrumbs} /> : null}

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {leading}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <h1 className="min-w-0 truncate font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <AboutDisclosure label={`About ${title}`}>
              {typeof description === "string" ? (
                <p>{description}</p>
              ) : (
                description
              )}
            </AboutDisclosure>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {meta ? (
        <div className="max-w-3xl text-sm leading-6 text-muted">{meta}</div>
      ) : null}
    </header>
  );
}
