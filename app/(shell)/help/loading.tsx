import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export default function HelpLoading() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-8`} aria-busy aria-label="Loading API help">
      {/* Anchor Jump Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-6 w-20 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-6 w-28 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-6 w-24 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-6 w-32 rounded-[var(--radius-sm)]" />
      </div>

      {/* 1. Quick Start Section */}
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-32 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-1.5 h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(17rem, 1fr))",
          }}
        >
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={`quick-start-${i}`} className="p-4.5">
              <Skeleton className="h-5 w-36 rounded-[var(--radius-sm)]" />
              <Skeleton className="mt-2 h-4 w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="mt-1.5 h-4 w-4/5 rounded-[var(--radius-sm)]" />
              <Skeleton className="mt-4 h-24 w-full rounded-[var(--radius-sm)]" />
            </Card>
          ))}
        </div>
      </div>

      {/* 2. Practical Workflow Guides Section */}
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-48 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-1.5 h-4 w-96 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        {/* Stepper Tabs */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-32 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-36 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-32 rounded-[var(--radius-sm)]" />
        </div>
        {/* Guide Banner */}
        <div className="rounded-[var(--radius-sm)] border border-border bg-muted-surface p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-64 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
          </div>
          <Skeleton className="mt-2 h-4 w-full rounded-[var(--radius-sm)]" />
        </div>
        {/* Steps Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, i) => (
            <Card key={`step-${i}`} className="p-4.5 pl-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-48 rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-28 w-full rounded-[var(--radius-sm)]" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. API Reference Catalog */}
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-44 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-1.5 h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-36 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-32 rounded-[var(--radius-sm)]" />
        </div>
        <Card className="p-4.5">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-40 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-24 rounded-[var(--radius-sm)]" />
          </div>
          <Skeleton className="mt-2 h-4 w-full rounded-[var(--radius-sm)]" />
          <div
            className="mt-4 grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
            }}
          >
            <Skeleton className="h-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-16 rounded-[var(--radius-sm)]" />
          </div>
          <Skeleton className="mt-4 h-32 w-full rounded-[var(--radius-sm)]" />
        </Card>
      </div>

      {/* 4. Utilities & Security */}
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-56 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-1.5 h-4 w-72 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
          }}
        >
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={`ref-${i}`} className="p-4.5">
              <Skeleton className="h-5 w-40 rounded-[var(--radius-sm)]" />
              <Skeleton className="mt-2 h-4 w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="mt-4 h-20 w-full rounded-[var(--radius-sm)]" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
