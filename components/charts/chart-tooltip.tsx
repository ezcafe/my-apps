"use client";

import { createPortal } from "react-dom";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import { cn } from "@/lib/cn";

const OFFSET = 12;
const PANEL_W = 200;
const PANEL_H = 56;

function clampViewportPosition(clientX: number, clientY: number): { left: number; top: number } {
  if (typeof window === "undefined") {
    return { left: clientX + OFFSET, top: clientY + OFFSET };
  }
  const maxLeft = window.innerWidth - PANEL_W - 8;
  const maxTop = window.innerHeight - PANEL_H - 8;
  return {
    left: Math.max(8, Math.min(clientX + OFFSET, maxLeft)),
    top: Math.max(8, Math.min(clientY + OFFSET, maxTop)),
  };
}

export function ChartTooltip({ tooltip }: { tooltip: ChartTooltipPayload | null }) {
  if (!tooltip || typeof document === "undefined") return null;

  const { left, top } = clampViewportPosition(tooltip.clientX, tooltip.clientY);

  return createPortal(
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none fixed z-50 min-w-[8rem] max-w-[14rem] rounded-[var(--radius-md)] border border-border bg-surface px-2.5 py-2 shadow-[var(--shadow-md)] fx-fade-in",
      )}
      style={{ left, top }}
    >
      <p className="truncate text-xs font-medium text-foreground">{tooltip.label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {tooltip.valueText}
      </p>
    </div>,
    document.body,
  );
}
