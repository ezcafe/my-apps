"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { buttonClassName } from "@/components/ui/button";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { BABY_HOME_ACTIONS } from "@/lib/baby-home-actions";
import { formatBabyCareWhen } from "@/lib/baby-format-care-when";
import {
  type BabyCareStatusItem,
  type BabyCareStatusType,
  type LastCareStatusByType,
} from "@/lib/baby-last-care-status";
import { babyLastCareStatusQueryOptions } from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const STATUS_ROWS: Array<{
  type: BabyCareStatusType;
  labelKey: "home.statusFeed" | "home.statusSleep" | "home.statusDiaper";
}> = [
  { type: "feed", labelKey: "home.statusFeed" },
  { type: "sleep", labelKey: "home.statusSleep" },
  { type: "diaper", labelKey: "home.statusDiaper" },
];

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function StatusRowValue({
  item,
  type,
  loading,
  statusError,
  t,
  locale,
}: {
  item: BabyCareStatusItem | null;
  type: BabyCareStatusType;
  loading: boolean;
  statusError: boolean;
  t: (key: string) => string;
  locale: "en" | "vi";
}) {
  if (loading) {
    return <p className="text-sm text-muted">{t("common.loading")}</p>;
  }
  if (statusError) {
    return <p className="text-sm text-muted">{t("home.statusError")}</p>;
  }
  if (item == null) {
    return <p className="text-sm text-muted">{t("home.statusEmpty")}</p>;
  }

  const when = formatBabyCareWhen(item.at, t, new Date(), locale);
  const openSleep = type === "sleep" && item.endedAt == null;

  if (openSleep) {
    return (
      <div className="space-y-0.5">
        <p className="text-base font-medium text-foreground">
          {t("home.statusInProgress")}
        </p>
        {when ? (
          <p className="text-sm text-muted">
            {fill(t("home.statusStarted"), { when })}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <p className="text-base font-medium text-foreground tabular-nums">
        {when || t("home.statusEmpty")}
      </p>
      {item.summary ? (
        <p className="text-sm text-muted">{item.summary}</p>
      ) : null}
    </div>
  );
}

function HomeStatusStrip({
  status,
  loading,
  statusError,
  t,
  locale,
}: {
  status: LastCareStatusByType | undefined;
  loading: boolean;
  statusError: boolean;
  t: (key: string) => string;
  locale: "en" | "vi";
}) {
  return (
    <section
      aria-labelledby="baby-home-status-heading"
      className="space-y-3"
      data-testid="baby-home-status"
    >
      <div className="space-y-1">
        <h2
          id="baby-home-status-heading"
          className="text-sm font-medium text-foreground"
        >
          {t("home.statusHeading")}
        </h2>
        <p className="text-sm text-muted">{t("home.statusHint")}</p>
      </div>
      <ul className="space-y-3">
        {STATUS_ROWS.map((row) => (
          <li
            key={row.type}
            className="space-y-1 border-b border-border/70 pb-3 last:border-b-0 last:pb-0"
            data-testid={`baby-home-status-${row.type}`}
          >
            <p className="text-sm font-medium text-foreground">
              {t(row.labelKey)}
            </p>
            <StatusRowValue
              item={status?.[row.type] ?? null}
              type={row.type}
              loading={loading}
              statusError={statusError}
              t={t}
              locale={locale}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Presentational home body — CTAs always render (status error → short error text). */
export function BabyHomeContent({
  status,
  loading,
  statusError = false,
  t,
  locale = "en",
}: {
  status: LastCareStatusByType | undefined;
  loading: boolean;
  statusError?: boolean;
  t: (key: string) => string;
  locale?: "en" | "vi";
}) {
  return (
    <div
      className={cn(
        SHELL_FULL_SPAN,
        SHELL_DASHBOARD_STACK,
        "fx-fade-in @container",
      )}
    >
      <HomeStatusStrip
        status={status}
        loading={loading}
        statusError={statusError}
        t={t}
        locale={locale}
      />

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        {BABY_HOME_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              buttonClassName({ size: "lg", variant: "primary" }),
              "min-h-14 w-full justify-center text-base",
            )}
          >
            {t(action.labelKey)}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BabyHome() {
  const { t, locale } = useBabyLocale();
  const statusQuery = useQuery(babyLastCareStatusQueryOptions());
  // Error → short error text (not empty); CTAs still rendered below.
  const status = statusQuery.isError ? undefined : statusQuery.data;

  return (
    <BabyHomeContent
      status={status}
      loading={statusQuery.isLoading}
      statusError={statusQuery.isError}
      t={t}
      locale={locale}
    />
  );
}
