"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useFormatDate } from "@/lib/format-date";
import { formatPm25Line } from "@/lib/weather/weather-day";
import type { WeatherSnapshot } from "@/lib/weather/open-meteo";
import { cn } from "@/lib/cn";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function KioskContextStrip({
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

  const pm25Line = weather ? formatPm25Line(weather.pm25) : null;
  const weatherLinkLabel = weather
    ? `Weather details, ${Math.round(weather.tempC)} degrees Celsius, PM2.5 ${pm25Line}`
    : undefined;

  return (
    <Card className="@container px-4 py-5">
      <div className="grid min-w-0 gap-4 @[32rem]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @[32rem]:items-center @[32rem]:gap-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">Today</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
            {weekday}
          </p>
          <p className="mt-0.5 text-sm text-muted">{calendarDate}</p>
        </div>

        <div
          aria-hidden
          className="hidden h-px w-full bg-border @[32rem]:block @[32rem]:h-12 @[32rem]:w-px"
        />

        <div className="min-w-0 @[32rem]:text-end">
          {weather ? (
            <Link
              href="/kiosk/weather"
              aria-label={weatherLinkLabel}
              className={cn(
                "block rounded-[var(--radius-sm)] text-start outline-none transition-colors",
                "fx-hit-40 fx-press",
                "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "@[32rem]:text-end",
              )}
            >
              <p className="text-sm font-medium text-muted">Weather</p>
              <p className="mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums">
                {Math.round(weather.tempC)}°C
              </p>
              <p className="mt-0.5 text-sm text-muted">{pm25Line}</p>
              <p className="mt-0.5 text-sm text-foreground">{weather.label}</p>
            </Link>
          ) : (
            <>
              <p className="text-sm font-medium text-muted">Weather</p>
              <p className="mt-2 text-sm text-muted @[32rem]:text-end">
                {weatherCity ? (
                  "Weather is temporarily unavailable."
                ) : (
                  <>
                    Set your city in{" "}
                    <Link
                      href="/settings#settings-kiosk"
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      Settings
                    </Link>
                    .
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
