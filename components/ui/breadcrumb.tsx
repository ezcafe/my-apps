import Link from "next/link";
import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

function IconChevron(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M7.28 14.78a.75.75 0 0 1 0-1.06L11 10 7.28 6.28a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/**
 * Tailwind Plus “Simple with chevrons” breadcrumbs, Quiet Ink tokens.
 * @see https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/breadcrumbs
 */
export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol role="list" className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <IconChevron className="size-4 shrink-0 text-muted" />
              ) : null}
              {isLast || !item.href ? (
                <span
                  className="max-w-[12rem] truncate font-medium text-foreground sm:max-w-[18rem]"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "max-w-[12rem] truncate rounded-[var(--radius-sm)] px-1 py-0.5 font-medium text-muted transition-colors duration-150 hover:bg-muted-surface hover:text-foreground sm:max-w-[18rem]",
                  )}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Convenience when a single ReactNode trail is preferred over structured items. */
export function BreadcrumbSlot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      {children}
    </nav>
  );
}
