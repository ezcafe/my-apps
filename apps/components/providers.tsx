"use client";

import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@/components/notification-provider";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
