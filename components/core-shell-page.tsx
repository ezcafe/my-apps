"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ShellMainPage } from "@/components/shell-main-page";
import { buttonClassName } from "@/components/ui/button";
import { resolveCoreAppHeader } from "@/lib/core-app-header";

/**
 * Core shell routes (`/settings`, `/help`) — pathname-derived title, meta, and CTA.
 */
export function CoreShellPage({
  children,
  description,
}: {
  children: ReactNode;
  /** AboutDisclosure body beside the title (e.g. extended API help intro). */
  description?: ReactNode;
}) {
  const pathname = usePathname();
  const resolved = resolveCoreAppHeader(pathname);

  return (
    <ShellMainPage
      title={resolved.title}
      meta={resolved.meta}
      breadcrumbs={resolved.breadcrumbs}
      description={description}
      actions={
        resolved.cta ? (
          <Link
            href={resolved.cta.href}
            className={buttonClassName({
              variant: "primary",
              className: "shrink-0",
            })}
          >
            {resolved.cta.label}
          </Link>
        ) : undefined
      }
    >
      {children}
    </ShellMainPage>
  );
}
