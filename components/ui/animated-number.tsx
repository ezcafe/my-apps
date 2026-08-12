"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/microinteractions";
import { cn } from "@/lib/cn";

const DURATION_MS = 300;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function AnimatedNumber({
  value,
  format,
  className,
  style,
  animationKey,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
  animationKey?: string;
}) {
  if (prefersReducedMotion()) {
    const rounded =
      Number.isInteger(value) && Math.abs(value) < 1e15
        ? value
        : value;
    return (
      <span className={cn("tabular-nums", className)} style={style}>
        {format(rounded)}
      </span>
    );
  }

  return (
    <AnimatedNumberMotion
      key={animationKey ?? String(value)}
      value={value}
      format={format}
      className={className}
      style={style}
    />
  );
}

function AnimatedNumberMotion({
  value,
  format,
  className,
  style,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const from = 0;
    const to = value;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / DURATION_MS);
      const eased = easeOutCubic(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const rounded =
    Number.isInteger(value) && Math.abs(value) < 1e15
      ? Math.round(display)
      : display;

  return (
    <span className={cn("tabular-nums", className)} style={style}>
      {format(rounded)}
    </span>
  );
}
