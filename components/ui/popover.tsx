"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const subscribeNoop = () => () => {};

/** Lightweight anchored panel — outside click closes.
 *  Panel portals to `document.body` so it isn’t clipped by ancestor
 *  `transform` / stacking (e.g. shell scroll containers). */
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const onOpenChangeRef = useRef(onOpenChange);
  const [pos, setPos] = useState<{ top: number; left: number; right: number } | null>(
    null,
  );

  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePos = () => {
      const triggerEl = triggerRef.current;
      if (!triggerEl) return;
      const rect = triggerEl.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: rect.left,
        right: rect.right,
      });
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (isControlled) onOpenChangeRef.current?.(false);
      else setUncontrolledOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, isControlled]);

  const panel = (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-modal="false"
      data-open={open}
      inert={!open}
      style={
        pos
          ? align === "end"
            ? { top: pos.top, right: `calc(100vw - ${pos.right}px)` }
            : { top: pos.top, left: pos.left }
          : undefined
      }
      className={cn(
        "pointer-events-none fixed z-[100] min-w-[min(100vw-2rem,18rem)] -translate-y-1 rounded-[var(--radius-md)] border border-border bg-surface p-3 opacity-0 shadow-[var(--shadow-md)] transition-[opacity,transform] duration-200 ease-out data-[open=true]:pointer-events-auto data-[open=true]:translate-y-0 data-[open=true]:opacity-100 motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </div>
  );

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface px-2.5 py-2 text-sm font-medium text-foreground transition-[opacity,transform,background-color] duration-200 hover:bg-muted-surface focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
          triggerClassName,
        )}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {mounted ? createPortal(panel, document.body) : null}
    </div>
  );
}
