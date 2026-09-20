"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { MoneyAppMenu } from "@/components/money-section-tabs";
import { PageHeading } from "@/components/page-heading";
import {
  babyHeaderBreadcrumbs,
  babyHomeTitleFromStatusBirthDate,
  resolveBabyAppHeader,
} from "@/lib/baby-app-header";
import { babyLocalDayWindow } from "@/lib/baby-home-day-window";
import { babyHomeQuickStatusQueryOptions } from "@/lib/baby-query-options";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

function BabySectionHeading() {
  const pathname = usePathname();
  const { t } = useBabyLocale();
  const resolved = resolveBabyAppHeader(pathname);
  const isHome = pathname === "/baby" || pathname === "/baby/";
  const [dayKey, setDayKey] = useState(
    () => babyLocalDayWindow(new Date()).dayKey,
  );

  useEffect(() => {
    if (!isHome) return;
    setDayKey(babyLocalDayWindow(new Date()).dayKey);
  }, [isHome]);

  const statusQuery = useQuery({
    ...babyHomeQuickStatusQueryOptions(new Date(`${dayKey}T12:00:00`)),
    enabled: isHome,
  });

  let title = t(resolved.titleKey);
  if (isHome && resolved.titleKey === "home.title") {
    title = babyHomeTitleFromStatusBirthDate({
      statusBirthDate:
        statusQuery.data?.babyHomeQuickStatus?.birthDate ?? null,
      now: new Date(),
      title: t("home.title"),
      titleWithAgeTemplate: t("home.titleWithAge"),
      titleWithAgeDayTemplate: t("home.titleWithAgeDay"),
      titleWithAgeDaysTemplate: t("home.titleWithAgeDays"),
    });
  }

  return (
    <PageHeading
      className={SHELL_FULL_SPAN}
      leading={<MoneyAppMenu />}
      title={title}
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
