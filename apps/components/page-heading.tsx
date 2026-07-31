import type { ReactNode } from "react";
import { AboutDisclosure } from "@/components/ui/about-disclosure";

/**
 * Application page heading — layout aligned with Tailwind Plus “meta + actions” page headings
 * (see https://tailwindcss.com/plus/ui-blocks/application-ui/headings/page-headings).
 */
export function PageHeading({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-x-8 ${className ?? ""}`}
    >
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <AboutDisclosure>
            {typeof description === "string" ? <p>{description}</p> : description}
          </AboutDisclosure>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}
