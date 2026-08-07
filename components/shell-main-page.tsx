import type { ReactNode } from "react";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";

const SHELL_MAIN_GRID =
  "shell-main grid grid-cols-2 gap-x-2 gap-y-6 py-8 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-8";

/**
 * Shared shell page chrome matching Money settings content layout:
 * 12-col grid, title row, full-span `space-y-6` section stack.
 */
export function ShellMainPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={SHELL_MAIN_GRID}>
      <header className={cn(MONEY_FULL_SPAN, "relative z-40 flex flex-col gap-2")}>
        <div className="flex items-center gap-3">
          <h1 className="min-w-0 flex-1 truncate text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
        </div>
        {subtitle ? (
          <p className="max-w-3xl text-sm leading-6 text-muted">{subtitle}</p>
        ) : null}
      </header>
      <div className={cn(MONEY_FULL_SPAN, "space-y-6")}>{children}</div>
    </div>
  );
}
