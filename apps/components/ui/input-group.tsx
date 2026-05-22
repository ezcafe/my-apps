import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const groupCls =
  "flex min-w-0 rounded-[var(--radius-md)] border border-border bg-background shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30";

const addonCls =
  "inline-flex shrink-0 items-center border-border bg-muted-surface px-3 py-2 text-sm font-medium text-muted tabular-nums";

const inputCls =
  "min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-foreground tabular-nums antialiased outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-45";

export function InputGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn(groupCls, className)}>{children}</div>;
}

export function InputGroupAddon({
  side,
  className,
  children,
}: {
  side: "leading" | "trailing";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        addonCls,
        side === "leading"
          ? "rounded-s-[var(--radius-md)] border-e"
          : "rounded-e-[var(--radius-md)] border-s",
        className,
      )}
    >
      {children}
    </span>
  );
}

export type InputGroupInputProps = InputHTMLAttributes<HTMLInputElement>;

export function InputGroupInput({ className, ...props }: InputGroupInputProps) {
  return <input className={cn(inputCls, className)} {...props} />;
}
