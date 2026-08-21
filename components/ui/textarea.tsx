import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full min-w-0 rounded-[var(--radius-md)] border border-border bg-background px-4 py-3 text-base text-foreground antialiased outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 aria-[invalid=true]:border-destructive";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(base, "min-h-[5.5rem] resize-y", className)} {...props} />;
}
