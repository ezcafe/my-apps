"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { MoneyAppMenu } from "@/components/money-section-tabs";
import { PageHeading } from "@/components/page-heading";
import {
  babyHeaderBreadcrumbs,
  resolveBabyAppHeader,
} from "@/lib/baby-app-header";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

function BabySectionHeading() {
  const pathname = usePathname();
  const { t } = useBabyLocale();
  const resolved = resolveBabyAppHeader(pathname);

  return (
    <PageHeading
      className={SHELL_FULL_SPAN}
      leading={<MoneyAppMenu />}
      title={t(resolved.titleKey)}
      breadcrumbs={babyHeaderBreadcrumbs(resolved.breadcrumbs, t)}
    />
  );
}

/** Money-style grid + hamburger heading for Baby Care (no shell rail). */
export function BabyRouteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-6">
      <BabySectionHeading />
      {children}
    </div>
  );
}
