"use client";

import { ParentSize } from "@visx/responsive";
import type { ReactNode } from "react";

/**
 * visx ParentSize for chart slots: short debounce cuts resize thrash after
 * flex/grid settle; the min-size gate still skips the empty first paint.
 */
export function ChartParentSize({
  children,
  className = "size-full min-h-0 min-w-0",
}: {
  children: (size: { width: number; height: number }) => ReactNode;
  className?: string;
}) {
  return (
    <ParentSize className={className} debounceTime={50}>
      {({ width, height }) =>
        width > 0 && height > 0 ? children({ width, height }) : null
      }
    </ParentSize>
  );
}
