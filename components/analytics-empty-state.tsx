import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type AnalyticsEmptyStateIcon =
  | "chart"
  | "table"
  | "flow"
  | "wallet"
  | "bills"
  | "savings"
  | "loan"
  | "investment";

const CHART_ICON_BG = [
  "bg-[color-mix(in_oklab,var(--chart-0)_22%,transparent)] text-chart-0",
  "bg-[color-mix(in_oklab,var(--chart-1)_22%,transparent)] text-chart-1",
  "bg-[color-mix(in_oklab,var(--chart-2)_22%,transparent)] text-chart-2",
  "bg-[color-mix(in_oklab,var(--chart-3)_22%,transparent)] text-chart-3",
  "bg-[color-mix(in_oklab,var(--chart-4)_22%,transparent)] text-chart-4",
  "bg-[color-mix(in_oklab,var(--chart-5)_22%,transparent)] text-chart-5",
  "bg-[color-mix(in_oklab,var(--chart-6)_22%,transparent)] text-chart-6",
  "bg-[color-mix(in_oklab,var(--chart-7)_22%,transparent)] text-chart-7",
] as const;

function iconBgClass(accentChartIndex?: number): string {
  if (accentChartIndex == null) {
    return "bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] text-muted";
  }
  const i = ((accentChartIndex % 8) + 8) % 8;
  return CHART_ICON_BG[i] ?? CHART_ICON_BG[0];
}

/** Application-style empty state (dashed panel, icon, title, body). */
export function AnalyticsEmptyState({
  title,
  description,
  minHeightClass = "min-h-[180px]",
  action,
  secondaryAction,
  primaryAction,
  icon = "chart",
  accentChartIndex,
  className = "",
  descriptionClassName = "",
}: {
  title: string;
  description: string;
  minHeightClass?: string;
  action?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  /** Renders as a primary Button-styled link (preferred CTA). */
  primaryAction?: { href: string; label: string };
  icon?: AnalyticsEmptyStateIcon;
  accentChartIndex?: number;
  className?: string;
  /** Merged onto the description paragraph (e.g. line-clamp-1). */
  descriptionClassName?: string;
}) {
  const linkAction = primaryAction ? undefined : action;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] px-4 py-6 fx-fade-in",
        minHeightClass,
        className,
      )}
      role="status"
    >
      <div className="fx-stagger-children max-w-sm text-center">
        <div
          className={cn(
            "mx-auto flex size-9 items-center justify-center rounded-full ring-1 ring-border",
            iconBgClass(accentChartIndex),
          )}
          aria-hidden
        >
          <EmptyStateIcon id={icon} />
        </div>
        <h3 className="mt-3 font-display text-sm font-semibold text-foreground">{title}</h3>
        <p
          className={cn("mt-1 text-sm leading-relaxed text-muted", descriptionClassName)}
        >
          {description}
        </p>
        {primaryAction || linkAction || secondaryAction ? (
          <div className="mt-5 flex flex-col items-center justify-center gap-3">
            {primaryAction ? (
              <Link
                href={primaryAction.href}
                className={buttonClassName({ variant: "primary", size: "md" })}
              >
                {primaryAction.label}
              </Link>
            ) : null}
            {linkAction || secondaryAction ? (
              <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                {linkAction ? (
                  <Link
                    href={linkAction.href}
                    className="text-sm font-semibold text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
                  >
                    {linkAction.label}
                  </Link>
                ) : null}
                {linkAction && secondaryAction ? (
                  <span className="text-sm text-muted" aria-hidden>
                    ·
                  </span>
                ) : null}
                {secondaryAction ? (
                  <Link
                    href={secondaryAction.href}
                    className="text-sm font-semibold text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
                  >
                    {secondaryAction.label}
                  </Link>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyStateIcon({ id }: { id: AnalyticsEmptyStateIcon }) {
  switch (id) {
    case "table":
      return <IconTable />;
    case "flow":
      return <IconFlow />;
    case "wallet":
      return <IconWallet />;
    case "bills":
      return <IconBills />;
    case "savings":
      return <IconSavings />;
    case "loan":
      return <IconLoan />;
    case "investment":
      return <IconInvestment />;
    default:
      return <IconChart />;
  }
}

function IconChart() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75H7.5m-1.125-1.125H3.375m1.125 1.125v-1.5m0 1.125H9.75M3.375 5.625c0-.621.504-1.125 1.125-1.125m0 0h17.25c.621 0 1.125.504 1.125 1.125M3.375 5.625v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75H7.5c-.621 0-1.125.504-1.125 1.125M19.125 5.625v1.5c0 .621.504 1.125 1.125 1.125m-17.25 0h17.25"
      />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
      />
    </svg>
  );
}

function IconBills() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function IconSavings() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function IconLoan() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function IconInvestment() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    </svg>
  );
}
