"use client";

import type { DateFormat } from "@/components/preferences-provider";
import { useNotify } from "@/components/notification-provider";
import { usePreferences } from "@/components/preferences-provider";
import { dateFormatPreview } from "@/lib/format-date";
import { moneyQuickPickChipCls, moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";
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
        className={moneyQuickPickGroupCls}
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
              className={moneyQuickPickChipCls(active)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted">
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
    <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-surface p-6">
      {inner}
    </div>
  );
}
