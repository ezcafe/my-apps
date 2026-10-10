import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function WeatherDayCardSkeleton() {
  return (
    <Card className="min-w-0 px-4 py-5">
      <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
      <Skeleton className="mt-3 h-9 w-28 rounded-[var(--radius-sm)]" />
      <Skeleton className="mt-4 h-48 w-full rounded-[var(--radius-sm)]" />
    </Card>
  );
}

export function WeatherDayPageSkeleton() {
  return (
    <div
      className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,26rem),1fr))] gap-4"
      aria-busy
      aria-label="Loading weather"
    >
      <WeatherDayCardSkeleton />
      <WeatherDayCardSkeleton />
      <WeatherDayCardSkeleton />
    </div>
  );
}
