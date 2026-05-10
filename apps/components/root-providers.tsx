"use client";

import { NotificationProvider } from "@/components/notification-provider";
import { ThemeProvider } from "@/components/theme-provider";

/** Theme + toasts for all routes (including public). No SessionProvider. */
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </ThemeProvider>
  );
}
