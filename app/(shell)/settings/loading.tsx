import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusStripSkeleton } from "@/components/money-analytics-skeleton";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export default function SettingsLoading() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-6`} aria-busy aria-label="Loading settings">
      <StatusStripSkeleton />
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={`settings-section-${i}`} className="p-4">
          <Skeleton className="h-6 w-32 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-4 h-24 w-full rounded-[var(--radius-sm)]" />
        </Card>
      ))}
    </div>
  );
}
