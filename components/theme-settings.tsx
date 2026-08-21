"use client";

import { useNotify } from "@/components/notification-provider";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { moneyQuickPickChipCls, moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";
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
        Teal accent on off-white in light mode; neutral dark + teal in dark.
        System follows <code className="font-mono text-sm">prefers-color-scheme</code>.
      </p>
      {showResolved ? (
        <p className="text-sm text-muted">
          Resolved: <span className="font-mono">{resolved}</span>
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label="Appearance mode"
        className={moneyQuickPickGroupCls}
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
              className={moneyQuickPickChipCls(active)}
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
