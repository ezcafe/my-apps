"use client";

import { type ReactNode, type SVGProps } from "react";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

function IconEllipsisVertical(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
    </svg>
  );
}

export type MoreMenuItemVariant = "default" | "danger";

/** Shared overflow / secondary-actions menu (Popover + ellipsis). */
export function MoreMenu({
  children,
  "aria-label": ariaLabel = "More options",
  align = "end",
  open,
  onOpenChange,
  active = false,
  trigger,
  triggerClassName,
  className,
  label,
}: {
  children: ReactNode;
  "aria-label"?: string;
  align?: "start" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Dirty / non-default secondary state — shows a small accent dot on the trigger. */
  active?: boolean;
  /** Override the default ellipsis icon. */
  trigger?: ReactNode;
  triggerClassName?: string;
  className?: string;
  /** Optional text label beside the icon (e.g. "More"). */
  label?: string;
}) {
  return (
    <Popover
      align={align}
      aria-label={ariaLabel}
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <span className="relative inline-flex items-center gap-1.5">
          {trigger ?? <IconEllipsisVertical className="size-5" />}
          {label ? <span className="text-sm font-medium">{label}</span> : null}
          {active ? (
            <span
              className="absolute -end-0.5 -top-0.5 size-1.5 rounded-full bg-accent"
              aria-hidden
            />
          ) : null}
        </span>
      }
      triggerClassName={cn(
        "fx-hit-40 size-10 shrink-0 p-0",
        label && "h-10 w-auto gap-1.5 px-2.5",
        active && "border-accent/40",
        triggerClassName,
      )}
      className={cn("min-w-[12rem] p-1.5", className)}
    >
      {children}
    </Popover>
  );
}

export function MoreMenuItem({
  children,
  onClick,
  variant = "default",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: MoreMenuItemVariant;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45",
        variant === "danger"
          ? "text-[var(--destructive-muted-text)] hover:bg-[var(--destructive-muted-bg)]"
          : "text-foreground hover:bg-muted-surface",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
