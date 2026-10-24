import { ShellMainPage } from "@/components/shell-main-page";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { cn } from "@/lib/cn";

function Block({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fx-shimmer rounded-[var(--radius-sm)] bg-muted/50",
        className,
      )}
    />
  );
}

/** Skeleton mirrors FoodsPage: calendar → day log + AI panel. */
export default function FoodsLoading() {
  return (
    <ShellMainPage title="Foods" meta="Loading…">
      <div className={cn(SHELL_FULL_SPAN, "flex flex-col gap-6")}>
        <section className="rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex justify-center">
            <Block className="h-6 w-40" />
          </div>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
          >
            {Array.from({ length: 35 }).map((_, i) => (
              <Block key={i} className="min-h-14" />
            ))}
          </div>
        </section>
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
          }}
        >
          <section className="rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
            <Block className="mb-3 h-5 w-32" />
            <Block className="mb-2 h-10 w-full" />
            <Block className="mb-2 h-10 w-full" />
            <Block className="h-24 w-full" />
          </section>
          <section className="rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
            <Block className="mb-3 h-5 w-24" />
            <Block className="mb-2 h-16 w-full" />
            <Block className="h-20 w-full" />
          </section>
        </div>
      </div>
    </ShellMainPage>
  );
}
