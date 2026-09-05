"use client";

import { useCallback, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  kioskWidgetsByFeature,
  normalizeKioskWidgets,
  type KioskWidgetId,
} from "@/lib/kiosk/widget-registry";

export function KioskWidgetSettings({
  initialWidgets,
}: {
  initialWidgets: KioskWidgetId[];
}) {
  const notify = useNotify();
  const [enabled, setEnabled] = useState<Set<KioskWidgetId>>(
    () => new Set(initialWidgets),
  );
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (next: Set<KioskWidgetId>) => {
      setSaving(true);
      try {
        const kioskWidgets = normalizeKioskWidgets([...next]);
        const res = await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kioskWidgets }),
        });
        const json = (await res.json()) as {
          error?: string;
          data?: { kioskWidgets: KioskWidgetId[] };
        };
        if (!res.ok) {
          throw new Error(json.error ?? "Could not save kiosk widgets");
        }
        const saved = new Set(json.data?.kioskWidgets ?? kioskWidgets);
        setEnabled(saved);
        notify.success(
          "Kiosk updated",
          saved.size === 0
            ? "All widgets hidden"
            : `${saved.size} widget${saved.size === 1 ? "" : "s"} enabled`,
        );
      } catch (e) {
        notify.error(
          "Could not save kiosk",
          e instanceof Error ? e.message : "Try again.",
        );
      } finally {
        setSaving(false);
      }
    },
    [notify],
  );

  function toggle(id: KioskWidgetId, checked: boolean) {
    const next = new Set(enabled);
    if (checked) next.add(id);
    else next.delete(id);
    setEnabled(next);
    void save(next);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Choose which widgets appear on your kiosk dashboard at{" "}
        <a href="/kiosk" className="font-medium text-accent underline-offset-4 hover:underline">
          /kiosk
        </a>
        .
      </p>
      {kioskWidgetsByFeature().map((group) => (
        <div key={group.feature} className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">{group.label}</h3>
          <ul
            role="list"
            className="divide-y divide-border rounded-[var(--radius-sm)] bg-background"
            aria-label={`${group.label} kiosk widgets`}
          >
            {group.widgets.map((widget) => {
              const checked = enabled.has(widget.id);
              return (
                <li key={widget.id} className="min-w-0">
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <Checkbox
                      checked={checked}
                      disabled={saving}
                      onChange={() => toggle(widget.id, !checked)}
                      ariaLabel={`Show ${widget.label} on kiosk`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {widget.label}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {widget.description}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
