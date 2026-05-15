import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a money tab panel chunk loads (`next/dynamic`). */
export function MoneyTabContentFallback() {
  return (
    <Card
      className="p-6"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading tab content"
    >
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </Card>
  );
}
