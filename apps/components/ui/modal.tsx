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

export function Modal({
  open,
  onClose,
  title,
  labelledBy,
  bare,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Ignored when `bare` */
  title?: string | null;
  /** Use when `bare` and heading lives inside children */
  labelledBy?: string;
  /** Full-bleed body (no built-in title row) */
  bare?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientMounted,
    getServerMounted,
  );

  useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) queueMicrotask(() => el.showModal());
    } else if (el.open) {
      el.close();
    }
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const ariaLabelledBy =
    bare ? labelledBy : title ? "modal-dialog-title" : labelledBy;

  return createPortal(
    <dialog
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 m-auto max-h-[min(90dvh,52rem)] w-[min(100%-2rem,56rem)] max-w-[calc(100%-2rem)] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-0 text-foreground shadow-[var(--shadow-md)] backdrop:bg-black/45 open:flex open:flex-col fx-overlay",
        className,
      )}
      aria-labelledby={ariaLabelledBy}
      aria-modal="true"
    >
      {!bare && title ? (
        <>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
            <h2 id="modal-dialog-title" className="text-lg font-medium tracking-tight">
              {title}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close"
              iconOnly
            >
              ✕
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      )}
    </dialog>,
    document.body,
  );
}
