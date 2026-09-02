"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useFormatDate } from "@/lib/format-date";
import type { WeatherSnapshot } from "@/lib/weather/open-meteo";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function HomeContextStrip({
  weather,
  weatherCity,
}: {
  weather: WeatherSnapshot | null;
  weatherCity: string | null;
}) {
  const { formatDate } = useFormatDate();
  const now = new Date();
  const weekday = WEEKDAYS[now.getDay()] ?? "";
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const calendarDate =
    formatDate(iso, { omitYearIfCurrent: true }) ??
    formatDate(iso) ??
    iso;

  return (
    <Card className="@container px-4 py-4">
      <div className="grid min-w-0 gap-4 @[32rem]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @[32rem]:items-center @[32rem]:gap-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">Today</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {weekday}
          </p>
          <p className="mt-0.5 text-sm text-muted">{calendarDate}</p>
        </div>

        <div
          aria-hidden
          className="hidden h-px w-full bg-border @[32rem]:block @[32rem]:h-12 @[32rem]:w-px"
        />

        <div className="min-w-0 @[32rem]:text-end">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @[32rem]:justify-end">
            <p className="text-sm font-medium text-muted">Weather</p>
            <Link
              href="/settings#settings-home"
              className="text-sm font-medium text-accent underline-offset-4 transition-colors duration-150 hover:underline"
            >
              Change city
            </Link>
          </div>
          {weather ? (
            <>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl @[32rem]:text-end">
                {Math.round(weather.tempC)}°C
              </p>
              <p className="mt-0.5 text-sm text-foreground @[32rem]:text-end">
                {weather.label}
              </p>
              <p className="mt-0.5 text-sm text-muted @[32rem]:text-end">
                {weatherCity ?? weather.locationLabel}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted @[32rem]:text-end">
              {weatherCity ? (
                "Weather is temporarily unavailable."
              ) : (
                <>
                  Set your city in{" "}
                  <Link
                    href="/settings#settings-home"
                    className="font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Settings
                  </Link>
                  .
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
