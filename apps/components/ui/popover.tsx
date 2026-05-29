"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

/** Lightweight anchored panel — outside click closes */
export function Popover({
  trigger,
  triggerClassName,
  align = "end",
  className,
  "aria-label": ariaLabel,
  open: openProp,
  onOpenChange,
  children,
}: {
  trigger: ReactNode;
  triggerClassName?: string;
  align?: "start" | "end";
  className?: string;
  "aria-label"?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = onOpenChange !== undefined;
  const open = isControlled ? (openProp ?? false) : uncontrolledOpen;

  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(open) : next;
    if (isControlled) onOpenChange(resolved);
    else setUncontrolledOpen(resolved);
  };

  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface px-2.5 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-sm)] transition-[opacity,transform,box-shadow] duration-200 hover:bg-muted-surface focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
          triggerClassName,
        )}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {/* Mount the panel always so exit animation can play. `inert`
          (HTML attribute) hides it from a11y + tab order when closed,
          and CSS targets [data-open=true|false] to drive the fade. */}
      <div
        id={id}
        role="dialog"
        aria-modal="false"
        data-open={open}
        inert={!open}
        className={cn(
          "pointer-events-none absolute top-[calc(100%+0.5rem)] z-50 min-w-[min(100vw-2rem,18rem)] -translate-y-1 rounded-[var(--radius-md)] border border-border bg-surface p-3 opacity-0 shadow-[var(--shadow-md)] transition-[opacity,transform] duration-200 ease-out data-[open=true]:pointer-events-auto data-[open=true]:translate-y-0 data-[open=true]:opacity-100 motion-reduce:transition-none",
          align === "end" ? "end-0" : "start-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
