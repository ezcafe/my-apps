import { auth } from "@/auth";
import { CoreShellPage } from "@/components/core-shell-page";
import { WeatherDayPageSkeleton } from "@/components/weather/weather-day-page-skeleton";
import { getUserPreferences } from "@/lib/user-preferences-service";
import { formatWeatherDayMeta } from "@/lib/weather/weather-day";

export default async function KioskWeatherLoading() {
  let meta: string | undefined;
  try {
    const session = await auth();
    const userSub = session?.user?.id;
    if (userSub) {
      const prefs = await getUserPreferences(userSub);
      if (prefs.weatherCity) {
        meta = formatWeatherDayMeta(
          prefs.weatherCity,
          new Date().toISOString().slice(0, 10),
        );
      }
    }
  } catch {
    meta = undefined;
  }

  return (
    <CoreShellPage meta={meta}>
      <WeatherDayPageSkeleton />
    </CoreShellPage>
  );
}
