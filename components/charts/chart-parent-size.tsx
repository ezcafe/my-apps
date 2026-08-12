"use client";

import { ParentSize } from "@visx/responsive";
import { useLayoutEffect, type ReactNode } from "react";

type ParentSizeChildArgs = {
  width: number;
  height: number;
  top: number;
  left: number;
  ref: HTMLDivElement | null;
  resize: (dims: {
    width: number;
    height: number;
    top: number;
    left: number;
  }) => void;
};

/**
 * visx ParentSize for chart slots: short debounce cuts resize thrash after
 * flex/grid settle; the min-size gate still skips the empty first paint.
 *
 * Forces a layout remeasure when ResizeObserver leaves 0×0 — Safari/iOS can
 * miss the first size for absolutely filled slots that mount after scroll
 * (deferred “More insights” charts).
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
      {(dims: ParentSizeChildArgs) => (
        <ChartParentSizePaint dims={dims}>{children}</ChartParentSizePaint>
      )}
    </ParentSize>
  );
}

function ChartParentSizePaint({
  dims,
  children,
}: {
  dims: ParentSizeChildArgs;
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const { width, height, ref, resize } = dims;

  useLayoutEffect(() => {
    if (!ref || (width > 0 && height > 0)) return;
    const measure = () => {
      const rect = ref.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        resize({
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
        });
      }
    };
    measure();
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [ref, width, height, resize]);

  return width > 0 && height > 0 ? children({ width, height }) : null;
}
