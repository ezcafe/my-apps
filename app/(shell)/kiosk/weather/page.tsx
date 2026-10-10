import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import { CoreShellPage } from "@/components/core-shell-page";
import { WeatherDayView } from "@/components/weather/weather-day-view";
import { getUserPreferences } from "@/lib/user-preferences-service";
import { fetchWeatherDay } from "@/lib/weather/open-meteo";
import { formatWeatherDayMeta } from "@/lib/weather/weather-day";

export const dynamic = "force-dynamic";

export default async function KioskWeatherPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) redirect("/login");

  const prefs = await getUserPreferences(userSub);
  const city = prefs.weatherCity;
  const lat = prefs.weatherLatitude;
  const lon = prefs.weatherLongitude;

  if (!city || lat == null || lon == null) {
    return (
      <CoreShellPage>
        <AnalyticsEmptyState
          title="Set your city in Settings"
          description="Choose a city to see hourly weather and air quality."
          primaryAction={{
            href: "/settings#settings-kiosk",
            label: "Open Settings",
          }}
        />
      </CoreShellPage>
    );
  }

  const stableMeta = formatWeatherDayMeta(
    city,
    new Date().toISOString().slice(0, 10),
  );

  let day = null;
  try {
    day = await fetchWeatherDay(lat, lon, city);
  } catch {
    day = null;
  }

  if (!day) {
    return (
      <CoreShellPage meta={stableMeta}>
        <AnalyticsEmptyState
          title="Weather is temporarily unavailable."
          description="Try reloading the page in a few minutes, or check your city in Settings."
          primaryAction={{
            href: "/kiosk/weather",
            label: "Reload",
          }}
          secondaryAction={{
            href: "/settings#settings-kiosk",
            label: "Settings",
          }}
        />
      </CoreShellPage>
    );
  }

  return (
    <CoreShellPage meta={formatWeatherDayMeta(city, day.date)}>
      <WeatherDayView day={day} />
    </CoreShellPage>
  );
}
