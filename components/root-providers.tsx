"use client";

import { NotificationProvider } from "@/components/notification-provider";
import { PreferencesProvider } from "@/components/preferences-provider";
import { ThemeProvider } from "@/components/theme-provider";
import type { DateFormat } from "@/lib/date-format-preference";

/** Theme + toasts for all routes (including public). No SessionProvider. */
export function RootProviders({
  children,
  dateFormat,
}: {
  children: React.ReactNode;
  dateFormat: DateFormat;
}) {
  return (
    <ThemeProvider>
      <PreferencesProvider initialDateFormat={dateFormat}>
        <NotificationProvider>{children}</NotificationProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
