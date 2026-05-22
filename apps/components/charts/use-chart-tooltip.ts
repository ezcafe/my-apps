"use client";

import { useCallback, useState } from "react";

export type ChartTooltipPayload = {
  label: string;
  valueText: string;
  clientX: number;
  clientY: number;
};

export function useChartTooltip() {
  const [tooltip, setTooltip] = useState<ChartTooltipPayload | null>(null);

  const showTooltip = useCallback((payload: ChartTooltipPayload) => {
    setTooltip(payload);
  }, []);

  const moveTooltip = useCallback((payload: ChartTooltipPayload) => {
    setTooltip(payload);
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  return { tooltip, showTooltip, moveTooltip, hideTooltip };
}
