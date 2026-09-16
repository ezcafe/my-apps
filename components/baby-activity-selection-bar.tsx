"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { activitySelectionBarEditEnabled } from "@/lib/baby-insights-activity-log";

const subscribeNoop = () => () => {};
const getServerMounted = () => false;
const getClientMounted = () => true;

export function BabyActivitySelectionBar({
  selectedCount,
  busy,
  countLabel,
  editLabel,
  deleteLabel,
  clearLabel,
  toolbarLabel,
  onEdit,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  busy?: boolean;
  countLabel: string;
  editLabel: string;
  deleteLabel: string;
  clearLabel: string;
  toolbarLabel: string;
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

  const editEnabled = activitySelectionBarEditEnabled(selectedCount);

  // Portal past shell `<main>` scroll/stacking contexts so `position: fixed`
  // stays viewport-relative on mobile Safari.
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
      aria-live="polite"
      data-testid="baby-activity-selection-bar"
    >
      <div
        role="toolbar"
        aria-label={toolbarLabel}
        className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 shadow-[var(--shadow-md)] fx-fade-in sm:gap-3 sm:px-4"
      >
        <p className="px-1 text-sm font-medium text-foreground">{countLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || !editEnabled}
            onClick={onEdit}
          >
            {editLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={busy}
            onClick={onDelete}
          >
            {deleteLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={onClear}
          >
            {clearLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
