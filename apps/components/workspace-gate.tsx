"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/** Ensures Money workspace bootstrap runs once the Pocket ID session exists (sets ctx_workspace_money cookie). */
export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/money/workspace/init", { credentials: "include" }).catch(
      () => {},
    );
  }, [status]);

  return children;
}
