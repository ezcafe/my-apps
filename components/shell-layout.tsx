"use client";

import { SessionProvider } from "next-auth/react";
import { AppShell } from "@/components/app-shell";

/** Auth session and app chrome — workspace bootstrap is per-feature (e.g. Money under `money/layout.tsx`). */
export function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
