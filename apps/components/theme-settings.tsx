"use client";

import { useNotify } from "@/components/notification-provider";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { withViewTransition } from "@/lib/microinteractions";

const OPTIONS = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

export function ThemeSettings({ embedded }: { embedded?: boolean }) {
  const { theme, setTheme, resolved } = useTheme();
  const notify = useNotify();
  const showResolved = process.env.NODE_ENV === "development";

  const pick = (next: (typeof OPTIONS)[number]["id"]) => {
    if (theme === next) return;
    withViewTransition(() => {
      setTheme(next);
      notify.success(
        "Appearance updated",
        next === "system"
          ? "Following system preference"
          : `${next.charAt(0).toUpperCase()}${next.slice(1)} mode`,
      );
    });
  };

  const inner = (
    <>
      {!embedded ? (
        <h2 className="font-display text-lg font-medium tracking-tight">Appearance</h2>
      ) : null}
      <p className="text-sm text-muted">
        Light mode uses Atom One Light; dark mode uses Nord. System
        follows <code className="font-mono text-xs">prefers-color-scheme</code>.
      </p>
      {showResolved ? (
        <p className="text-xs text-muted">
          Resolved: <span className="font-mono">{resolved}</span>
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label="Appearance mode"
        className="inline-flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1 shadow-[var(--shadow-sm)]"
      >
        {OPTIONS.map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(opt.id)}
              className={cn(
                "min-w-20 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
                active
                  ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                  : "text-muted hover:bg-muted-surface hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{inner}</div>;
  }

  return (
    <Card className="space-y-4 p-6">
      {inner}
    </Card>
  );
}
