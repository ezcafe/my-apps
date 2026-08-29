import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-[var(--shadow-sm)] hover:bg-accent-hover hover:shadow-[0_2px_4px_rgb(0_0_0/0.08)] hover:-translate-y-px active:translate-y-0 active:shadow-[var(--shadow-sm)] border border-transparent disabled:bg-muted-surface disabled:text-muted disabled:opacity-60 disabled:shadow-none disabled:translate-y-0",
  secondary:
    "border border-border bg-secondary text-secondary-foreground hover:bg-secondary-hover",
  ghost:
    "border border-transparent bg-transparent text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]",
  danger:
    "border border-destructive/40 bg-transparent text-destructive hover:bg-destructive-muted-bg",
};

// Symmetric padding for label-only buttons. When an icon is on a side,
// the matching `pad*WithIcon` reduces that side by ~2px (optical alignment).
const padLabelOnly: Record<ButtonSize, string> = {
  sm: "px-4 py-2",
  md: "px-6 py-3",
  lg: "px-6 py-3.5",
};

const padLeadingIcon: Record<ButtonSize, string> = {
  sm: "pl-3 pr-4 py-2",
  md: "pl-5 pr-6 py-3",
  lg: "pl-5 pr-6 py-3.5",
};

const padTrailingIcon: Record<ButtonSize, string> = {
  sm: "pl-4 pr-3 py-2",
  md: "pl-6 pr-5 py-3",
  lg: "pl-6 pr-5 py-3.5",
};

const padIconOnly: Record<ButtonSize, string> = {
  // Icon-only buttons get equal padding and a hit-area floor of 44×44.
  sm: "p-2.5 fx-hit-40",
  md: "p-2.5 fx-hit-40",
  lg: "p-3 fx-hit-40",
};

const sizeText: Record<ButtonSize, string> = {
  sm: "gap-2 text-sm",
  md: "gap-2 text-base",
  lg: "gap-2.5 text-lg",
};

const base =
  "group relative inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-[background-color,box-shadow,transform,opacity] duration-150 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none fx-press";

type ClassNameOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Optical padding hints (auto-derived in <Button/>). */
  hasLeading?: boolean;
  hasTrailing?: boolean;
  iconOnly?: boolean;
};

function paddingFor({
  size,
  hasLeading,
  hasTrailing,
  iconOnly,
}: Required<Pick<ClassNameOptions, "size">> &
  Pick<ClassNameOptions, "hasLeading" | "hasTrailing" | "iconOnly">): string {
  if (iconOnly) return padIconOnly[size];
  if (hasLeading && !hasTrailing) return padLeadingIcon[size];
  if (hasTrailing && !hasLeading) return padTrailingIcon[size];
  return padLabelOnly[size];
}

/** Class string for elements that visually mimic Button (e.g. styled <Link>). */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
  hasLeading,
  hasTrailing,
  iconOnly,
}: ClassNameOptions = {}): string {
  return cn(
    base,
    variants[variant],
    sizeText[size],
    paddingFor({ size, hasLeading, hasTrailing, iconOnly }),
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Pure-icon button: enables 44×44 hit area + symmetric padding. */
  iconOnly?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  leading,
  trailing,
  iconOnly,
  className,
  children,
  ...props
}: ButtonProps) {
  const isIconOnly = iconOnly || (!children && (leading != null || trailing != null));
  return (
    <button
      type="button"
      className={buttonClassName({
        variant,
        size,
        className,
        hasLeading: leading != null,
        hasTrailing: trailing != null,
        iconOnly: isIconOnly,
      })}
      {...props}
    >
      {leading ? (
        <span className="inline-flex shrink-0">{leading}</span>
      ) : null}
      {children}
      {trailing ? (
        <span className="inline-flex shrink-0">{trailing}</span>
      ) : null}
    </button>
  );
}
