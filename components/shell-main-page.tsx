import type { ReactNode } from "react";
import { MoneyAppMenu } from "@/components/money-section-tabs";
import { PageHeading } from "@/components/page-heading";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";

const SHELL_MAIN_GRID =
  "shell-main grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-6";

/**
 * Shared shell page chrome matching Money:
 * 12-col grid, Plus page heading (menu + title + optional meta), full-span stack.
 * Shell aside is hidden on these routes via `hidesShellRailChrome`.
 */
export function ShellMainPage({
  title,
  subtitle,
  meta,
  description,
  actions,
  breadcrumbs,
  children,
}: {
  title: string;
  /** @deprecated Use `meta` instead. */
  subtitle?: ReactNode;
  meta?: ReactNode;
  /** AboutDisclosure body beside the title. */
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: import("@/components/ui/breadcrumb").BreadcrumbItem[];
  children: ReactNode;
}) {
  return (
    <div className={SHELL_MAIN_GRID}>
      <PageHeading
        className={MONEY_FULL_SPAN}
        leading={<MoneyAppMenu />}
        title={title}
        meta={meta ?? subtitle}
        description={description}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />
      <div className={cn(MONEY_FULL_SPAN, "space-y-6")}>{children}</div>
    </div>
  );
}
