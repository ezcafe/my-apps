"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, SVGProps } from "react";
import { ShellMainPage } from "@/components/shell-main-page";
import { buttonClassName } from "@/components/ui/button";
import { resolveCoreAppHeader } from "@/lib/core-app-header";

function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
            aria-label={resolved.cta.label}
            title={resolved.cta.label}
            className={buttonClassName({
              variant: "primary",
              responsiveIconOnly: true,
              hasLeading: true,
              className: "shrink-0",
            })}
          >
            <IconPlus className="size-5 shrink-0" />
            <span className="hidden sm:inline">{resolved.cta.label}</span>
          </Link>
        ) : undefined
      }
    >
      {children}
    </ShellMainPage>
  );
}
