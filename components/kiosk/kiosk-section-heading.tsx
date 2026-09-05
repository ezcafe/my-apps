import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function KioskSectionHeading({
  id,
  title,
  description,
  action,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-2",
        className,
      )}
    >
      <div className="min-w-0">
        <h2
          id={id}
          className="font-display text-lg font-medium tracking-tight text-foreground"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-sm font-medium text-accent underline-offset-4 transition-colors duration-150 hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
