"use client";

import { cn } from "@/lib/cn";

export type ChartLegendItem = {
  key: string;
  label: string;
  color: string;
  valueText: string;
};

export function ChartLegendList({
  items,
  hiddenKeys,
  onToggle,
  hoveredKey,
  onHover,
  className,
  showValues = true,
}: {
  items: ChartLegendItem[];
  hiddenKeys: Set<string>;
  onToggle: (key: string) => void;
  hoveredKey?: string | null;
  onHover?: (key: string | null) => void;
  className?: string;
  /** When false, render labels only (no amounts column). */
  showValues?: boolean;
}) {
  return (
    <ul
      className={cn(
        "analytics-chart-legend m-0 list-none p-0 text-muted",
        className,
      )}
    >
      {items.map((item) => {
        const hidden = hiddenKeys.has(item.key);
        const hovered = hoveredKey === item.key;
        return (
          <li key={item.key}>
            <button
              type="button"
              className={cn(
                "flex w-full gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 text-left transition-[opacity,background-color] duration-150 fx-press",
                showValues ? "justify-between" : "justify-start",
                hidden && "opacity-40",
                hovered && !hidden && "bg-muted-surface",
              )}
              aria-pressed={!hidden}
              aria-label={
                hidden
                  ? `Show ${item.label} in chart`
                  : `Hide ${item.label} from chart`
              }
              onClick={() => onToggle(item.key)}
              onMouseEnter={() => onHover?.(item.key)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(item.key)}
              onBlur={() => onHover?.(null)}
            >
              <span
                className={cn(
                  "flex min-w-0 items-center gap-2 truncate",
                  hidden && "line-through",
                )}
              >
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </span>
              {showValues ? (
                <span
                  className={cn("shrink-0 tabular-nums", hidden && "line-through")}
                >
                  {item.valueText}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
