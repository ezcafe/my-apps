"use client";

import type { StylePreset } from "@/components/theme-provider";
import { useNotify } from "@/components/notification-provider";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";
import { withViewTransition } from "@/lib/microinteractions";

const PRESETS: { id: StylePreset; title: string; blurb: string }[] = [
  {
    id: "linear",
    title: "Linear / Vercel",
    blurb: "Cool zinc neutrals, single accent, dense rhythm.",
  },
  {
    id: "apple",
    title: "Apple / iOS",
    blurb: "Warm gray chrome, system blue, softer surfaces.",
  },
  {
    id: "swiss",
    title: "Swiss / editorial",
    blurb: "Strict grid, pure contrast, no decorative shadows.",
  },
  {
    id: "notion",
    title: "Notion / Stripe",
    blurb: "Warm paper, teal accent, inset surfaces.",
  },
];

export function StyleSettings({ embedded }: { embedded?: boolean }) {
  const { style, setStyle } = useTheme();
  const notify = useNotify();

  const pick = (next: StylePreset) => {
    if (next === style) return;
    withViewTransition(() => {
      setStyle(next);
      notify.success(
        "Visual style updated",
        PRESETS.find((p) => p.id === next)?.title ?? next,
      );
    });
  };

  const inner = (
    <>
      {!embedded ? (
        <h2 className="font-display text-lg font-medium tracking-tight">Visual style</h2>
      ) : null}
      <p className="text-sm text-muted">
        Minimal presets share the same layout; tokens swap globally. Use Appearance below for
        light, dark, or system mode.
      </p>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
        }}
      >
        {PRESETS.map((p) => {
          const active = style === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              className={cn(
                "rounded-[var(--radius-md)] border border-transparent p-1 text-left transition-[box-shadow,transform] duration-200 hover:border-border fx-press",
                active &&
                  "border-ring shadow-[0_0_0_1px_var(--ring)] ring-2 ring-ring/30 ring-offset-2 ring-offset-background",
              )}
            >
              <div
                className="style-preview-scope overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-sm)]"
                data-preview-style={p.id}
              >
                <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  <span
                    className="font-display text-xs font-semibold text-[var(--foreground)]"
                  >
                    Aa
                  </span>
                  <span className="ms-auto size-2 rounded-full bg-[var(--accent)]" />
                </div>
                <div className="space-y-2 p-3">
                  <div className="h-2 w-full rounded-[var(--radius-sm)] bg-[var(--muted-surface)]" />
                  <div className="flex gap-2">
                    <div className="h-8 flex-1 rounded-[var(--radius-md)] bg-[var(--accent)] opacity-90" />
                    <div className="h-8 flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                  <div className="h-2 w-4/5 rounded-[var(--radius-sm)] bg-[var(--border)]" />
                </div>
              </div>
              <span className="mt-2 block px-1">
                <span className="font-medium text-foreground">{p.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{p.blurb}</span>
              </span>
              {active ? (
                <span className="sr-only">Selected</span>
              ) : (
                <span className="sr-only">Select style</span>
              )}
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
    <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
      {inner}
    </div>
  );
}
