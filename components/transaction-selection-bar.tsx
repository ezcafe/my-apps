"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

const subscribeNoop = () => () => {};
const getServerMounted = () => false;
const getClientMounted = () => true;

export function TransactionSelectionBar({
  selectedCount,
  busy,
  onEdit,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  busy?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientMounted,
    getServerMounted,
  );

  if (selectedCount <= 0 || !mounted) return null;

  const label =
    selectedCount === 1
      ? "1 transaction selected"
      : `${selectedCount.toLocaleString()} transactions selected`;

  // Portal past shell `<main>` scroll/stacking contexts so `position: fixed`
  // stays viewport-relative on mobile Safari.
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
      aria-live="polite"
    >
      <div
        role="toolbar"
        aria-label="Transaction actions"
        className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 shadow-[var(--shadow-md)] fx-fade-in sm:gap-3 sm:px-4"
      >
        <p className="px-1 text-sm font-medium text-foreground">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={busy}
            onClick={onDelete}
          >
            Delete
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
