import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  ref?: Ref<HTMLDivElement>;
};

/**
 * Surface container that survives every preset's radius/shadow tokens.
 *
 * Concentric radius rule (skill): if you nest a rounded element directly
 * inside a Card, the child must use `--radius-sm` (smaller). Use
 * `rounded-[var(--radius-sm)]` for inner buttons, chips, list rows, etc.
 * For 24px+ inner padding, treat the inner element as its own surface
 * and pick a radius independently.
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
        "rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-sm)]",
        interactive &&
          "transition-[box-shadow] duration-200 hover:shadow-[var(--shadow-md)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
