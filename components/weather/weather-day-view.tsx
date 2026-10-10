import { Card } from "@/components/ui/card";
import {
  formatPm25Now,
  formatRainTotal,
  formatTempNow,
  type WeatherDay,
} from "@/lib/weather/weather-day";
import { weatherDayLineAriaSummary } from "@/components/weather/weather-day-chart-helpers";
import {
  WeatherDayChart,
  type WeatherDayChartPoint,
} from "@/components/weather/weather-day-chart";

function chartPoints(
  hours: WeatherDay["hours"],
  pick: (h: WeatherDay["hours"][number]) => number | null,
  extra?: (h: WeatherDay["hours"][number]) => WeatherDayChartPoint["extra"],
): WeatherDayChartPoint[] {
  return hours.map((h) => ({
    hour: h.hour,
    value: pick(h),
    extra: extra?.(h),
  }));
}

export function WeatherDayView({ day }: { day: WeatherDay }) {
  const tempPoints = chartPoints(day.hours, (h) => h.tempC);
  const pm25Points = chartPoints(day.hours, (h) => h.pm25);
  const rainPoints = chartPoints(
    day.hours,
    (h) => h.rainMm,
    (h) => ({ rainProbPct: h.rainProbPct }),
  );

  const tempValues = tempPoints.map((p) => p.value);
  const pm25Values = pm25Points.map((p) => p.value);

  return (
    <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,26rem),1fr))] gap-4">
      <Card className="min-w-0 px-4 py-5">
        <p className="text-sm font-medium text-foreground">Temperature</p>
        <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatTempNow(day.current.tempC)}
        </p>
        <WeatherDayChart
          kind="line"
          points={tempPoints}
          nowIndex={day.nowIndex}
          colorIndex={0}
          ariaLabel={weatherDayLineAriaSummary(
            "Temperature today",
            tempValues,
            "°C",
          )}
          tooltipKind="temp"
        />
      </Card>

      <Card className="min-w-0 px-4 py-5">
        <p className="text-sm font-medium text-foreground">PM2.5</p>
        {day.aqAvailable ? (
          <>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatPm25Now(day.current.pm25)}
            </p>
            <WeatherDayChart
              kind="line"
              points={pm25Points}
              nowIndex={day.nowIndex}
              colorIndex={1}
              ariaLabel={weatherDayLineAriaSummary(
                "PM2.5 today",
                pm25Values,
                "µg/m³",
              )}
              tooltipKind="pm25"
            />
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Air quality is temporarily unavailable.
          </p>
        )}
      </Card>

      <Card className="min-w-0 px-4 py-5">
        <p className="text-sm font-medium text-foreground">Rain</p>
        <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatRainTotal(day.rainTotalMm)}
        </p>
        <WeatherDayChart
          kind="bars"
          points={rainPoints}
          nowIndex={day.nowIndex}
          colorIndex={2}
          ariaLabel={weatherDayLineAriaSummary(
            "Rain today",
            rainPoints.map((p) => p.value),
            "mm",
          )}
          tooltipKind="rain"
        />
      </Card>
    </div>
  );
}
