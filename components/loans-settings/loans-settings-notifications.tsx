"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { SettingsSection } from "@/components/money-settings/money-settings-shared";
import { Button } from "@/components/ui/button";
import {
  registerLoansServiceWorker,
  subscribeLoansPush,
  unsubscribeLoansPush,
} from "@/lib/loans-push-client";

function readNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function LoansSettingsNotifications() {
  const notify = useNotify();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => readNotificationPermission(),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
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
        toUserFacingMessage(e),
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
        toUserFacingMessage(e),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 max-w-4xl space-y-6">
      <SettingsSection
        id="loans-settings-notifications"
        title="Payment reminders"
        description="In-app banners and toasts appear on the Loans overview when an installment is due. Enable browser notifications to get alerts when the app is in the background (requires VAPID keys on the server)."
      >
        <p className="text-sm text-muted">
          Status:{" "}
          <span className="font-medium text-foreground">
            {permission === "unsupported"
              ? "Not supported in this browser"
              : permission}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="primary" onClick={enablePush} disabled={busy}>
            Enable browser notifications
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={disablePush}
            disabled={busy}
          >
            Remove subscription
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
