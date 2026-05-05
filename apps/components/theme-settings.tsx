"use client";

import { useNotify } from "@/components/notification-provider";
import { useTheme } from "@/components/theme-provider";

export function ThemeSettings({ embedded }: { embedded?: boolean }) {
  const { theme, setTheme, resolved } = useTheme();
  const notify = useNotify();

  const inner = (
    <>
      {!embedded ? (
        <h2 className="text-lg font-medium">Appearance</h2>
      ) : null}
      <p className="text-sm text-muted">
        Uses <code className="text-xs">prefers-color-scheme</code> when set to System.
        Resolved: <span className="font-mono text-xs">{resolved}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {(["system", "light", "dark"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              if (theme === t) return;
              setTheme(t);
              notify.success(
                "Appearance updated",
                t === "system"
                  ? "Following system preference"
                  : `${t.charAt(0).toUpperCase()}${t.slice(1)} mode`,
              );
            }}
            className={`rounded-lg border px-4 py-2 text-sm capitalize transition-colors ${
              theme === t
                ? "border-foreground bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]"
                : "border-border hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{inner}</div>;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-6">
      {inner}
    </div>
  );
}
