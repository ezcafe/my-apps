import { CoreShellPage } from "@/components/core-shell-page";
import { WeatherDayPageSkeleton } from "@/components/weather/weather-day-page-skeleton";

export default function KioskWeatherLoading() {
  return (
    <CoreShellPage>
      <WeatherDayPageSkeleton />
    </CoreShellPage>
  );
}
