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

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const onOpenChangeRef = useRef(onOpenChange);
  /** Skip outside-close briefly after open (Playwright retries / busy remounts). */
  const ignoreOutsideUntilRef = useRef(0);
  const [pos, setPos] = useState<{
    top: number;
    left?: number;
    right?: number;
    strategy: "fixed" | "absolute";
  } | null>(null);
  const [panelHost, setPanelHost] = useState<HTMLElement | null>(null);
  /** False when trigger is display:none (e.g. shell mobile menu on desktop). */
  const [triggerShown, setTriggerShown] = useState(true);

  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(open) : next;
    if (resolved) ignoreOutsideUntilRef.current = Date.now() + 400;
    if (isControlled) onOpenChange(resolved);
    else setUncontrolledOpen(resolved);
  };

  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useLayoutEffect(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;
    const updateShown = () => {
      const style = window.getComputedStyle(triggerEl);
      setTriggerShown(
        style.display !== "none" && style.visibility !== "hidden",
      );
    };
    updateShown();
    const ro = new ResizeObserver(updateShown);
    ro.observe(triggerEl);
    window.addEventListener("resize", updateShown);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateShown);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerShown) return;

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
  }, [open, align, triggerShown]);

  useEffect(() => {
    if (!open || !triggerShown) return;
    const onDoc = (e: MouseEvent) => {
      if (Date.now() < ignoreOutsideUntilRef.current) return;
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (isControlled) onOpenChangeRef.current?.(false);
      else setUncontrolledOpen(false);
    };
    // Defer so the opening click's mousedown cannot close immediately.
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, isControlled, triggerShown]);

  // Portal host ready on mount so controlled open=true remounts show the panel.
  useLayoutEffect(() => {
    if (panelHost) return;
    const dialog = triggerRef.current?.closest("dialog");
    setPanelHost(dialog ?? document.body);
  }, [panelHost]);

  const inModal = panelHost?.tagName === "DIALOG";
  const panelOpen = open && triggerShown;

  // Unmount when closed so section links / role=dialog leave the a11y tree
  // (inert alone still matched Playwright getByRole in e2e).
  const panel =
    panelOpen ? (
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="false"
        data-open="true"
        data-floating-panel=""
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
          "min-w-[min(100vw-2rem,18rem)] max-w-[calc(100vw-1.5rem)] rounded-[var(--radius-md)] border border-border bg-surface p-3 opacity-100 shadow-[var(--shadow-md)] translate-y-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
          inModal ? "z-[60]" : "z-[110]",
          className,
        )}
      >
        {children}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative inline-flex", containerClassName)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={panelOpen}
        aria-controls={panelOpen ? id : undefined}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface px-2.5 py-2 text-sm font-medium text-foreground transition-[opacity,transform,background-color] duration-200 hover:bg-muted-surface focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
          triggerClassName,
        )}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {mounted && panelHost && panel ? createPortal(panel, panelHost) : null}
    </div>
  );
}
