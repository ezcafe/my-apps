import type { ReactNode } from "react";
import { AboutDisclosure } from "@/components/ui/about-disclosure";

/**
 * Application page heading — layout aligned with Tailwind Plus “meta + actions” page headings
 * (see https://tailwindcss.com/plus/ui-blocks/application-ui/headings/page-headings).
 */
export function PageHeading({
  title,
  description,
  leading,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  /** Optional control before the title (e.g. Money menu on detail pages). */
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`relative z-40 flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-x-8 ${className ?? ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <h1 className="min-w-0 truncate font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
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
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}
