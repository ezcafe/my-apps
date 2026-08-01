import type { ReactNode } from "react";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import { cn } from "@/lib/cn";

/** Page title + optional description (info icon tooltip beside the title). */
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
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <h2
        id={titleId}
        className="font-display text-lg font-medium tracking-tight"
      >
        {title}
      </h2>
      {description ? (
        <AboutDisclosure label={`About ${title}`}>
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
    <div
      className={cn(
        // Keep flex on the same node as any `hidden @md:flex` visibility — `@md:block` would
        // override flex and stack filter tabs vertically.
        "flex w-full min-w-0 flex-nowrap items-center gap-0 overflow-x-auto border-b border-border pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="toolbar"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
