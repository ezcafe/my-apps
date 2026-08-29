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
  containerClassName,
  align = "end",
  className,
  "aria-label": ariaLabel,
  open: openProp,
  onOpenChange,
  children,
}: {
  trigger: ReactNode;
  triggerClassName?: string;
  containerClassName?: string;
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
  const [pos, setPos] = useState<{
    top: number;
    left?: number;
    right?: number;
    strategy: "fixed" | "absolute";
  } | null>(null);
  const [panelHost, setPanelHost] = useState<HTMLElement | null>(null);

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
      const dialog = triggerEl.closest("dialog");
      const rect = triggerEl.getBoundingClientRect();

      if (dialog) {
        const dialogRect = dialog.getBoundingClientRect();
        setPanelHost(dialog);
        setPos({
          top: rect.bottom - dialogRect.top + 8,
          left: align === "start" ? rect.left - dialogRect.left : undefined,
          right:
            align === "end" ? dialogRect.right - rect.right : undefined,
          strategy: "absolute",
        });
        return;
      }

      setPanelHost(document.body);
      setPos({
        top: rect.bottom + 8,
        left: align === "start" ? rect.left : undefined,
        right: align === "end" ? window.innerWidth - rect.right : undefined,
        strategy: "fixed",
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

  const inModal = panelHost?.tagName === "DIALOG";

  const panel = (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-modal="false"
      data-open={open}
      data-floating-panel=""
      inert={!open}
      style={
        pos
          ? {
              position: pos.strategy,
              top: pos.top,
              ...(pos.left !== undefined ? { left: pos.left } : {}),
              ...(pos.right !== undefined ? { right: pos.right } : {}),
            }
          : undefined
      }
      className={cn(
        "pointer-events-none min-w-[min(100vw-2rem,18rem)] max-w-[calc(100vw-1.5rem)] -translate-y-1 rounded-[var(--radius-md)] border border-border bg-surface p-3 opacity-0 shadow-[var(--shadow-md)] transition-[opacity,transform] duration-200 ease-out data-[open=true]:pointer-events-auto data-[open=true]:translate-y-0 data-[open=true]:opacity-100 motion-reduce:transition-none",
        inModal ? "z-[60]" : "z-[110]",
        className,
      )}
    >
      {children}
    </div>
  );

  return (
    <div ref={rootRef} className={cn("relative inline-flex", containerClassName)}>
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
      {mounted && panelHost ? createPortal(panel, panelHost) : null}
    </div>
  );
}
