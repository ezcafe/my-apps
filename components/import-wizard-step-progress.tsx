"use client";

import { cn } from "@/lib/cn";
import {
  moneyQuickPickChipCls,
  moneyQuickPickGroupCls,
} from "@/lib/money-quick-pick-chip-cls";

export type ImportWizardStepMeta = { title: string; hint: string };

/**
 * Shared step strip for Money CSV and Investment statement import wizards.
 */
export function ImportWizardStepProgress<TStep extends string>({
  steps,
  stepMeta,
  current,
  onStepClick,
  ariaLabel = "Import steps",
}: {
  steps: readonly TStep[];
  stepMeta: Record<TStep, ImportWizardStepMeta>;
  current: TStep;
  onStepClick: (step: TStep) => void;
  ariaLabel?: string;
}) {
  const currentIdx = steps.indexOf(current);
  const progressPct = ((currentIdx + 1) / steps.length) * 100;

  return (
    <nav aria-label={ariaLabel} className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Step {currentIdx + 1} of {steps.length}
        </span>
        <span className="font-medium text-foreground">
          {stepMeta[current].title}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-sm text-muted">{stepMeta[current].hint}</p>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className={moneyQuickPickGroupCls}
      >
        {steps.map((id, i) => {
          const done = i < currentIdx;
          const active = id === current;
          const future = i > currentIdx;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-current={active ? "step" : undefined}
              disabled={future}
              onClick={() => {
                if (!future && i !== currentIdx) onStepClick(id);
              }}
              className={cn(
                moneyQuickPickChipCls(active),
                "disabled:cursor-not-allowed disabled:opacity-45",
                done && !active ? "text-foreground" : null,
              )}
            >
              {stepMeta[id].title}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
