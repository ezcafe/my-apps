"use client";

import type { DateFormat } from "@/components/preferences-provider";
import { useNotify } from "@/components/notification-provider";
import { usePreferences } from "@/components/preferences-provider";
import { cn } from "@/lib/cn";
import { dateFormatPreview } from "@/lib/format-date";
import { withViewTransition } from "@/lib/microinteractions";

const OPTIONS: { id: DateFormat; label: string; description: string }[] = [
  {
    id: "locale",
    label: "System",
    description: "Follow your browser locale",
  },
  {
    id: "mdy",
    label: "US",
    description: "Month / day / year",
  },
  {
    id: "dmy",
    label: "European",
    description: "Day / month / year",
  },
  {
    id: "ymd",
    label: "ISO",
    description: "Year-month-day",
  },
];

export function DateFormatSettings({ embedded }: { embedded?: boolean }) {
  const { dateFormat, setDateFormat } = usePreferences();
  const notify = useNotify();

  const pick = (next: DateFormat) => {
    if (dateFormat === next) return;
    withViewTransition(() => {
      setDateFormat(next);
      const label = OPTIONS.find((o) => o.id === next)?.label ?? next;
      notify.success("Date format updated", label);
    });
  };

  const inner = (
    <>
      {!embedded ? (
        <h2 className="font-display text-lg font-medium tracking-tight">
          Date format
        </h2>
      ) : null}
      <p className="text-sm text-muted">
        Controls how dates appear in analytics, transactions, charts, and
        labels. Form inputs still use your device&apos;s native date picker.
      </p>
      <div
        role="radiogroup"
        aria-label="Date format"
        className="grid gap-2"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        {OPTIONS.map((opt) => {
          const active = dateFormat === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(opt.id)}
              className={cn(
                "rounded-[var(--radius-md)] border border-border bg-background p-3 text-left transition-[background-color,box-shadow] duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
                active &&
                  "border-ring shadow-[0_0_0_1px_var(--ring)] ring-2 ring-ring/30 ring-offset-2 ring-offset-background",
              )}
            >
              <span className="block text-sm font-medium text-foreground">
                {opt.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {opt.description}
              </span>
              <span className="mt-2 block font-mono text-xs text-foreground">
                {dateFormatPreview(opt.id)}
              </span>
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
