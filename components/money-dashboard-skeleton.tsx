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
import {
  moneyQuickPickChipCls,
  moneyQuickPickChipHeightCls,
  moneyQuickPickGroupCls,
  moneyQuickPickOtherChipCls,
} from "@/lib/money-quick-pick-chip-cls";
import { MoneyUsageQuickPickOtherChipContent } from "@/components/money-usage-quick-pick";

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
        className={cn(
          moneyQuickPickOtherChipCls(active),
          "basis-full @md:basis-auto w-full @md:w-auto",
        )}
      >
        <MoneyUsageQuickPickOtherChipContent label={label} />
      </button>
    );
  }
  return (
    <button type="button" disabled className={moneyQuickPickChipCls(active)}>
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
  withPct = false,
}: {
  legend: string;
  required?: boolean;
  className?: string;
  chips?: number;
  /** “Open picker” chip shown after the skeleton placeholders. */
  otherChipLabel?: string;
  /** Two-line chip placeholders (name + budget %). */
  withPct?: boolean;
}) {
  return (
    <fieldset className={cn("@container grid min-w-0 gap-1.5 text-sm", className)}>
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
      <div className={moneyQuickPickGroupCls}>
        {Array.from({ length: chips }, (_, index) =>
          withPct ? (
            <span
              key={`${legend}-${index}`}
              className={cn(
                "inline-flex w-28 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] px-4",
                moneyQuickPickChipHeightCls,
              )}
            >
              <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-3.5 w-10 rounded-[var(--radius-sm)]" />
            </span>
          ) : (
            <Skeleton
              key={`${legend}-${index}`}
              className={cn(
                "w-24 rounded-[var(--radius-sm)]",
                moneyQuickPickChipHeightCls,
              )}
            />
          ),
        )}
        {otherChipLabel ? (
          <StaticChip label={otherChipLabel} variant="other" />
        ) : null}
      </div>
    </fieldset>
  );
}

export function MoneyQuickPickGroupSkeleton({
  widths,
  className,
}: {
  widths: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn(moneyQuickPickGroupCls, className)}>
      {widths.map((widthClass, index) => (
        <Skeleton
          key={`quick-pick-chip-${index}`}
          className={cn(
            "rounded-[var(--radius-sm)]",
            moneyQuickPickChipHeightCls,
            widthClass,
          )}
        />
      ))}
    </div>
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
      <Skeleton
        className={cn(
          "w-full rounded-[var(--radius-md)]",
          moneyQuickPickChipHeightCls,
        )}
      />
    </Field>
  );
}

export function MoneyInputGroupSkeleton({
  label,
  required,
  leading = "—",
  trailing = "USD",
}: {
  label: string;
  required?: boolean;
  leading?: string;
  trailing?: string;
}) {
  return (
    <Field label={label} required={required}>
      <InputGroup>
        {leading ? (
          <InputGroupAddon side="leading" aria-hidden>
            {leading}
          </InputGroupAddon>
        ) : null}
        <InputGroupInput value="" disabled aria-label={label} />
        <InputGroupAddon side="trailing" aria-hidden>
          {trailing}
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

/** Chunk placeholder for `/investments/new`. */
export function InvestmentOpenCloseFormSkeleton() {
  return (
    <div
      className="grid min-w-0 gap-4 [&>*]:col-span-full"
      style={{
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
      }}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading activity form"
    >
      <fieldset className="grid min-w-0 gap-1.5 text-sm">
        <legend className="text-muted">What are you doing?</legend>
        <div className={moneyQuickPickGroupCls}>
          <StaticChip label="Trade" active />
          <StaticChip label="Open" />
          <StaticChip label="Close" />
        </div>
      </fieldset>
      <MoneyInputGroupSkeleton label="Quantity" required leading="" trailing="Lots" />
      <MoneyLookupQuickPickSkeleton legend="Symbol" required />
      <MoneyInputGroupSkeleton label="Open price" required />
      <MoneyInputGroupSkeleton label="Close price" required />
      <MoneyInputGroupSkeleton label="Fee" leading="" trailing="USD" />
      <fieldset className="grid min-w-0 gap-1.5 text-sm">
        <legend className="text-muted">When</legend>
        <div className={moneyQuickPickGroupCls}>
          <StaticChip label="Today" active />
          <StaticChip label="Yesterday" />
          <StaticChip label="Select custom date" variant="other" />
        </div>
      </fieldset>
      <Field label="Notes">
        <Textarea rows={3} value="" disabled />
      </Field>
      <Button type="submit" disabled>
        Record trade
      </Button>
    </div>
  );
}

/** In-form placeholder while investment activity fields chunk-load. */
export function InvestmentActivityFieldsSkeleton() {
  return (
    <div
      className="grid min-w-0 gap-4 [grid-column:1/-1]"
      role="status"
      aria-busy="true"
      aria-label="Loading investment fields"
    >
      <fieldset className="grid min-w-0 gap-1.5 text-sm">
        <legend className="text-muted">Direction</legend>
        <div className={moneyQuickPickGroupCls}>
          <StaticChip label="Buy" active />
          <StaticChip label="Sell" />
        </div>
      </fieldset>
      <MoneyLookupQuickPickSkeleton legend="Symbol" required />
      <MoneyInputGroupSkeleton label="Quantity" required leading="" trailing="Lots" />
      <MoneyInputGroupSkeleton label="Open price" required />
      <MoneyInputGroupSkeleton label="Close price" required />
      <MoneyInputGroupSkeleton label="Fee" leading="" trailing="USD" />
    </div>
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
        <h2 className="sr-only">New transaction</h2>

        <form
          className="grid min-w-0 gap-4"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
          }}
        >
          <fieldset className="grid min-w-0 gap-1.5 text-sm [grid-column:1/-1]">
            <legend className="text-muted">Type</legend>
            <div className={moneyQuickPickGroupCls}>
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
            legend="Category"
            withPct
            className="[grid-column:1/-1]"
          />

          <MoneyLookupQuickPickSkeleton
            legend="Account"
            required
            withPct
            className="[grid-column:1/-1]"
          />

          <fieldset className="grid min-w-0 gap-1.5 text-sm">
            <legend className="text-muted">Date</legend>
            <div className={moneyQuickPickGroupCls}>
              <StaticChip label="Today" active />
              <StaticChip label="Yesterday" />
              <StaticChip label="Select custom date" variant="other" />
            </div>
          </fieldset>

          <div className="[grid-column:1/-1]">
            <Button type="button" variant="ghost" size="sm" disabled>
              Notes &amp; extras
            </Button>
          </div>

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
