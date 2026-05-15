import Link from "next/link";

/** Application-style empty state (Tailwind Plus “empty states” pattern: dashed panel, icon, title, body). */
export function AnalyticsEmptyState({
  title,
  description,
  minHeightClass = "min-h-[180px]",
  action,
  icon = "chart",
  className = "",
  descriptionClassName = "",
}: {
  title: string;
  description: string;
  minHeightClass?: string;
  action?: { href: string; label: string };
  icon?: "chart" | "table" | "flow";
  className?: string;
  /** Merged onto the description paragraph (e.g. line-clamp-1). */
  descriptionClassName?: string;
}) {
  return (
    <div
      className={`flex w-full items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] px-6 py-10 fx-fade-in ${minHeightClass} ${className}`}
      role="status"
    >
      <div className="max-w-sm text-center">
        <div
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] ring-1 ring-border text-muted"
          aria-hidden
        >
          {icon === "table" ? <IconTable /> : icon === "flow" ? <IconFlow /> : <IconChart />}
        </div>
        <h3 className="mt-3 font-display text-sm font-semibold text-foreground">{title}</h3>
        <p
          className={`mt-1 text-sm leading-relaxed text-muted ${descriptionClassName}`.trim()}
        >
          {description}
        </p>
        {action ? (
          <p className="mt-5">
            <Link
              href={action.href}
              className="text-sm font-semibold text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
            >
              {action.label}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function IconChart() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function IconFlow() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function IconTable() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75H7.5m-1.125-1.125H3.375m1.125 1.125v-1.5m0 1.125H9.75M3.375 5.625c0-.621.504-1.125 1.125-1.125m0 0h17.25c.621 0 1.125.504 1.125 1.125M3.375 5.625v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75H7.5c-.621 0-1.125.504-1.125 1.125M19.125 5.625v1.5c0 .621.504 1.125 1.125 1.125m-17.25 0h17.25"
      />
    </svg>
  );
}
