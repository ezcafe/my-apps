"use client";

import { useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  registerLoansServiceWorker,
  subscribeLoansPush,
  unsubscribeLoansPush,
} from "@/lib/loans-push-client";

export function LoansSettingsNotifications() {
  const notify = useNotify();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    void registerLoansServiceWorker();
  }, []);

  async function enablePush() {
    setBusy(true);
    try {
      const ok = await subscribeLoansPush();
      setPermission(
        typeof Notification !== "undefined" ? Notification.permission : "unsupported",
      );
      if (ok) {
        notify.success("Browser notifications enabled");
      } else {
        notify.warning(
          "Notifications not enabled",
          "Allow notifications in your browser or set NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
        );
      }
    } catch (e) {
      notify.error(
        "Could not enable notifications",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      await unsubscribeLoansPush();
      notify.success("Push subscription removed");
    } catch (e) {
      notify.error(
        "Could not disable",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 max-w-4xl space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Payment reminders</h2>
        <p className="mt-2 text-sm text-muted">
          In-app banners and toasts appear on the Loans overview when an
          installment is due. Enable browser notifications to get alerts when
          the app is in the background (requires VAPID keys on the server).
        </p>
        <p className="mt-2 text-sm text-muted">
          Status:{" "}
          <span className="font-medium text-foreground">
            {permission === "unsupported"
              ? "Not supported in this browser"
              : permission}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={enablePush} disabled={busy}>
            Enable browser notifications
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={disablePush}
            disabled={busy}
          >
            Remove subscription
          </Button>
        </div>
      </Card>
    </div>
  );
}
