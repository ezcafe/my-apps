import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "accent" | "muted" | "destructive";

const tones: Record<Tone, string> = {
  default: "border-border bg-muted-surface text-foreground",
  accent: "border-accent/30 bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-accent",
  muted: "border-transparent bg-muted-surface text-muted",
  destructive:
    "border-destructive-muted-border bg-destructive-muted-bg text-destructive-muted-text",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] border px-2 py-0.5 text-xs font-medium leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
