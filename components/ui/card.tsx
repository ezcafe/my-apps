import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  ref?: Ref<HTMLDivElement>;
};

/**
 * Surface container — border only (no shadow) per clean-minimal rules.
 *
 * Concentric radius: nest with `--radius-sm`. For 24px+ inner padding,
 * treat the inner element as its own surface.
 */
export function Card({
  children,
  className,
  interactive,
  ref,
  ...props
}: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-md)] border border-border bg-surface",
        interactive &&
          "transition-[border-color] duration-200 hover:border-[color-mix(in_oklab,var(--border)_70%,var(--foreground))]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
