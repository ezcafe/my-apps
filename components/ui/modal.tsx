"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const subscribeNoop = () => () => {};
const getServerMounted = () => false;
const getClientMounted = () => true;

/** Layout branch for Modal chrome. Bare owns its own scroll; all others scroll. */
export function resolveModalChromeMode(opts: {
  bare?: boolean;
  title?: string | null;
}): "bare" | "titled-scroll" | "untitled-scroll" {
  if (opts.bare) return "bare";
  if (opts.title) return "titled-scroll";
  return "untitled-scroll";
}

export function Modal({
  open,
  onClose,
  title,
  labelledBy,
  bare,
  children,
  className,
  closeDisabled,
}: {
  open: boolean;
  onClose: () => void;
  /** Ignored when `bare` */
  title?: string | null;
  /** Use when `bare` and heading lives inside children */
  labelledBy?: string;
  /** Full-bleed body (no built-in title row). Children must own the scroll region. */
  bare?: boolean;
  children: ReactNode;
  className?: string;
  /** When true, Escape and ✕ do not call onClose (e.g. mutation in flight). */
  closeDisabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientMounted,
    getServerMounted,
  );

  useEffect(() => {
    if (!mounted || !open) return;
    const el = ref.current;
    if (!el || el.open) return;
    queueMicrotask(() => {
      try {
        if (!el.isConnected || el.open) return;
        el.showModal();
      } catch {
        // Safari can throw InvalidStateError if the dialog was detached
        // or already open between schedule and run — ignore.
      }
    });
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted || !open) return;
    const el = ref.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      if (closeDisabled) return;
      onClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [mounted, open, onClose, closeDisabled]);

  // Unmount when closed so closed sheets leave the a11y tree (Playwright
  // getByRole('dialog') must only see the open payment / confirm sheet).
  if (!mounted || !open) return null;

  const chrome = resolveModalChromeMode({ bare, title });
  const ariaLabelledBy =
    chrome === "bare"
      ? labelledBy
      : chrome === "titled-scroll"
        ? "modal-dialog-title"
        : labelledBy;

  return createPortal(
    <dialog
      ref={ref}
      className={cn(
        // Height must come from content (then clamp with max-h). Do not use
        // flex-1 / flex-basis 0% in the chain below: with min-h-0 + non-visible
        // overflow, Safari resolves that to ~0px — a bordered “line” centered
        // by inset-0 + m-auto. Desktop Chrome often still sizes from content,
        // so the bug is easy to miss locally.
        "fixed inset-0 z-50 m-auto max-h-[min(90dvh,52rem)] w-[min(100%-1.5rem,56rem)] max-w-[calc(100%-1.5rem)] overflow-visible rounded-[var(--radius-md)] border border-border bg-surface p-0 text-foreground shadow-[var(--shadow-md)] backdrop:bg-black/45 open:flex open:flex-col sm:w-[min(100%-2rem,56rem)] sm:max-w-[calc(100%-2rem)] fx-overlay",
        className,
      )}
      aria-labelledby={ariaLabelledBy}
      aria-modal="true"
    >
      <div className="flex max-h-[inherit] min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[inherit]">
        {chrome === "bare" ? (
          // Bare = full-bleed: no padding and no scroll here. Children own
          // chrome padding and the single scroll region (e.g. table).
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            {children}
          </div>
        ) : (
          <>
            {chrome === "titled-scroll" ? (
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-6 sm:py-4">
                <h2
                  id="modal-dialog-title"
                  className="text-lg font-medium tracking-tight"
                >
                  {title}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={closeDisabled}
                  aria-label="Close"
                  iconOnly
                >
                  ✕
                </Button>
              </div>
            ) : null}
            <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
              {children}
            </div>
          </>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
