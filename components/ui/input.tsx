import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full min-w-0 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-base text-foreground antialiased transition-[border-color,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(base, className)} {...props} />;
}
