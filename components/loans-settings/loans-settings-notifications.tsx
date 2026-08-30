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
import { SettingsPageLayout } from "@/components/settings/settings-page-layout";
import {
  LOANS_SETTINGS_CATEGORIES,
  type LoansSettingsCategoryId,
} from "@/components/settings/settings-types";

function readNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

function notificationPermissionLabel(
  permission: NotificationPermission | "unsupported",
): string {
  switch (permission) {
    case "granted":
      return "Allowed";
    case "denied":
      return "Blocked";
    case "default":
      return "Not asked yet";
    case "unsupported":
      return "Not supported in this browser";
  }
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
          "Allow notifications in your browser settings, then try again.",
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
    <SettingsPageLayout<LoansSettingsCategoryId>
      categories={LOANS_SETTINGS_CATEGORIES}
      idPrefix="loans-settings"
      searchPlaceholder="Search Loans settings (e.g. notifications, reminders, push)…"
      sections={{
        notifications: (
          <SettingsSection
            id="loans-settings-notifications"
            title="Payment reminders"
            description="In-app banners and toasts appear on the Loans overview when an installment is due. Enable browser notifications to get alerts when the app is in the background."
          >
            <div className="rounded-[var(--radius-md)] border border-border bg-background p-5 space-y-4">
              <p className="text-sm text-muted">
                Status:{" "}
                <span className="font-medium text-foreground">
                  {notificationPermissionLabel(permission)}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
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
            </div>
          </SettingsSection>
        ),
      }}
    />
  );
}
