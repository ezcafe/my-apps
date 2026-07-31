import type { ReactNode } from "react";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import { cn } from "@/lib/cn";

/** Page title + optional description (collapsed behind About by default). */
export function MoneyPageHeader({
  title,
  description,
  titleId,
  className,
}: {
  title: string;
  description?: string;
  titleId?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h2
        id={titleId}
        className="font-display text-lg font-medium tracking-tight"
      >
        {title}
      </h2>
      {description ? (
        <AboutDisclosure>
          <p>{description}</p>
        </AboutDisclosure>
      ) : null}
    </div>
  );
}

/** Underline strip matching the analytics filter toolbar chrome. */
export function MoneyFilterToolbar({
  children,
  "aria-label": ariaLabel = "Filter controls",
  className,
}: {
  children: ReactNode;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-border", className)}>
      <div
        className="flex flex-nowrap items-center gap-0 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="toolbar"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}
