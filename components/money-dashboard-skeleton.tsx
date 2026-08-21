import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { moneyQuickPickOtherChipCls } from "@/lib/money-quick-pick-chip-cls";

function StaticChip({
  label,
  active = false,
  variant = "default",
}: {
  label: string;
  active?: boolean;
  variant?: "default" | "other";
}) {
  const isOther = variant === "other";
  if (isOther) {
    return (
      <button
        type="button"
        disabled
        className={moneyQuickPickOtherChipCls(active)}
      >
        <span className="relative z-[1] inline-flex min-w-0 max-w-full items-center gap-1.5">
          <span
            aria-hidden
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted-surface text-muted"
          >
            <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
              <path
                d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="min-w-0 truncate">{label}</span>
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled
      className={cn(
        "min-w-20 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200",
        active
          ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
          : "text-muted",
      )}
    >
      {label}
    </button>
  );
}

export function MoneyLookupQuickPickSkeleton({
  legend,
  required,
  className,
  chips = 4,
  otherChipLabel,
}: {
  legend: string;
  required?: boolean;
  className?: string;
  chips?: number;
  /** “Open picker” chip shown after the skeleton placeholders. */
  otherChipLabel?: string;
}) {
  return (
    <fieldset className={cn("grid min-w-0 gap-1.5 text-sm", className)}>
      <legend className="text-muted">
        {required ? (
          <>
            <span className="text-foreground" aria-hidden>
              *
            </span>{" "}
            {legend}
          </>
        ) : (
          legend
        )}
      </legend>
      <div className="inline-flex min-w-0 flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1">
        {Array.from({ length: chips }, (_, index) => (
          <Skeleton
            key={`${legend}-${index}`}
            className="h-9 w-24 rounded-[var(--radius-sm)]"
          />
        ))}
        {otherChipLabel ? (
          <StaticChip label={otherChipLabel} variant="other" />
        ) : null}
      </div>
    </fieldset>
  );
}

export function MoneyTagsFieldSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Field
      label="Tags"
      hint="Separate tags with spaces. Tags are created and linked when you save."
      className={className}
    >
      <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
    </Field>
  );
}

/** Placeholder for the `/money/new` transaction form while the chunk loads. */
export function MoneyDashboardSkeleton() {
  return (
    <div
      className="min-w-0 space-y-4"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading money dashboard"
    >
      <div>
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-medium tracking-tight">
            New transaction
          </h2>
          <span className="text-sm text-muted">USD</span>
        </header>

        <form
          className="grid min-w-0 gap-4"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
          }}
        >
          <fieldset className="grid min-w-0 gap-1.5 text-sm [grid-column:1/-1]">
            <legend className="text-muted">Kind</legend>
            <div className="inline-flex min-w-0 flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1">
              <StaticChip label="Expense" active />
              <StaticChip label="Income" />
              <StaticChip label="Transfer" />
            </div>
          </fieldset>

          <Field label="Amount" required>
            <InputGroup>
              <InputGroupAddon side="leading" aria-hidden>
                $
              </InputGroupAddon>
              <InputGroupInput
                value=""
                inputMode="decimal"
                placeholder="24.99"
                disabled
                aria-label="Amount"
              />
              <InputGroupAddon side="trailing" aria-hidden>
                USD
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <MoneyLookupQuickPickSkeleton
            legend="Account"
            required
            className="[grid-column:1/-1]"
          />

          <MoneyLookupQuickPickSkeleton
            legend="Category"
            className="[grid-column:1/-1]"
          />

          <fieldset className="grid min-w-0 gap-1.5 text-sm">
            <legend className="text-muted">When</legend>
            <div className="inline-flex min-w-0 flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1">
              <StaticChip label="Today" active />
              <StaticChip label="Yesterday" />
              <StaticChip label="Select custom date" variant="other" />
            </div>
          </fieldset>

          <div className="[grid-column:1/-1]">
            <Button type="button" variant="ghost" size="sm" disabled>
              More details
            </Button>
          </div>

          <Field label="Notes" className="[grid-column:1/-1]">
            <Textarea rows={3} value="" disabled />
          </Field>

          <div className="flex flex-wrap items-center gap-3 [grid-column:1/-1]">
            <Button type="submit" disabled>
              Save transaction
            </Button>
            <span aria-live="polite" className="text-sm text-muted">
              Reduces account balance.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
