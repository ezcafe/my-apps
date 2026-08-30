import { Skeleton } from "@/components/ui/skeleton";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export default function InvestmentSettingsLoading() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-8`}>
      {/* Statement Import Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-36 rounded-[var(--radius-sm)]" />
          <Skeleton className="size-4 rounded-full" />
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-background p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-56 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-72 rounded-[var(--radius-sm)]" />
            </div>
            <Skeleton className="h-9 w-36 rounded-[var(--radius-sm)]" />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-20 rounded-[var(--radius-sm)]" />
          </div>
        </div>
      </section>

      {/* Instruments Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-44 rounded-[var(--radius-sm)]" />
          <Skeleton className="size-4 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-16 rounded-[var(--radius-sm)]" />
        </div>
      </section>

      {/* Ledger Accounts Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="size-4 rounded-full" />
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-background p-5">
          <div className="space-y-4">
            <Skeleton className="h-10 w-32 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-24 w-full rounded-[var(--radius-sm)]" />
          </div>
        </div>
      </section>
    </div>
  );
}
