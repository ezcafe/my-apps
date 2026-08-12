"use client";

import type { DateFormat } from "@/components/preferences-provider";
import { useNotify } from "@/components/notification-provider";
import { usePreferences } from "@/components/preferences-provider";
import { cn } from "@/lib/cn";
import { dateFormatPreview } from "@/lib/format-date";
import { withViewTransition } from "@/lib/microinteractions";

const OPTIONS: { id: DateFormat; label: string }[] = [
  { id: "locale", label: "System" },
  { id: "mdy", label: "US" },
  { id: "dmy", label: "EU" },
  { id: "ymd", label: "ISO" },
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
        className="inline-flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1 shadow-[var(--shadow-sm)]"
      >
        {OPTIONS.map((opt) => {
          const active = dateFormat === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${opt.label}, example ${dateFormatPreview(opt.id)}`}
              onClick={() => pick(opt.id)}
              className={cn(
                "min-w-16 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
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
      <p className="text-xs text-muted">
        Example:{" "}
        <span className="font-mono text-foreground">
          {dateFormatPreview(dateFormat)}
        </span>
      </p>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{inner}</div>;
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      {inner}
    </div>
  );
}
