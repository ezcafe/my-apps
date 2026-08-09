"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { AppShell } from "@/components/app-shell";

/** Auth session and app chrome — workspace bootstrap is per-feature (e.g. Money under `money/layout.tsx`). */
export function ShellLayout({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
