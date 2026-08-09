"use client";

import { ParentSize } from "@visx/responsive";
import type { ReactNode } from "react";

/**
 * visx ParentSize tuned for chart slots: no debounce (Safari can miss a
 * delayed resize after flex/grid settles) and a stable size-full shell.
 */
export function ChartParentSize({
  children,
  className = "size-full min-h-0 min-w-0",
}: {
  children: (size: { width: number; height: number }) => ReactNode;
  className?: string;
}) {
  return (
    <ParentSize className={className} debounceTime={0}>
      {({ width, height }) =>
        width > 0 && height > 0 ? children({ width, height }) : null
      }
    </ParentSize>
  );
}
