"use client";

import { SessionProvider } from "next-auth/react";
import { AppShell } from "@/components/app-shell";
import { WorkspaceGate } from "@/components/workspace-gate";

/** Auth session, money workspace bootstrap, and app chrome — only for protected routes. */
export function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WorkspaceGate>
        <AppShell>{children}</AppShell>
      </WorkspaceGate>
    </SessionProvider>
  );
}
