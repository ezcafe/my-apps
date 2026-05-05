/** Placeholder while a money tab panel chunk loads (`next/dynamic`). */
export function MoneyTabContentFallback() {
  return (
    <div
      className="rounded-md border border-border bg-surface p-6"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading tab content"
    >
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-40 rounded-md bg-[color-mix(in_oklab,var(--foreground)_12%,transparent)]" />
        <div className="h-32 w-full rounded-md bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3">
          <div className="h-24 rounded-md bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]" />
          <div className="h-24 rounded-md bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]" />
        </div>
      </div>
    </div>
  );
}
