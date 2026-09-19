"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export type BabyCareGuidelineSectionId =
  | "feed"
  | "sleep"
  | "diaper"
  | "pump";

export type BabyCareGuidelineSection = {
  id: BabyCareGuidelineSectionId;
  title: string;
  body: string[];
};

type BabyCareGuidelinesProps = {
  sections: BabyCareGuidelineSection[];
  /** Controlled open id (exclusive). Omit for internal state. */
  openId?: BabyCareGuidelineSectionId | null;
  onOpenChange?: (id: BabyCareGuidelineSectionId | null) => void;
  className?: string;
};

/**
 * Row 4 exclusive accordion — one open at a time; all collapsed by default.
 */
export function BabyCareGuidelines({
  sections,
  openId: openIdProp,
  onOpenChange,
  className,
}: BabyCareGuidelinesProps) {
  const reactId = useId();
  const [internalOpen, setInternalOpen] =
    useState<BabyCareGuidelineSectionId | null>(null);
  const controlled = openIdProp !== undefined;
  const openId = controlled ? openIdProp! : internalOpen;

  function setOpen(next: BabyCareGuidelineSectionId | null) {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <div
      data-testid="baby-care-guidelines"
      data-section="guidelines"
      className={cn(
        "space-y-2 rounded-[var(--radius-md)] border border-border bg-surface p-2",
        className,
      )}
    >
      {sections.map((section) => {
        const expanded = openId === section.id;
        const panelId = `${reactId}-panel-${section.id}`;
        const headerId = `${reactId}-header-${section.id}`;
        return (
          <div key={section.id} data-guideline={section.id}>
            <button
              type="button"
              id={headerId}
              aria-expanded={expanded}
              aria-controls={panelId}
              data-testid={`baby-guideline-${section.id}`}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium text-foreground fx-press fx-hit-40 transition-colors hover:bg-secondary-hover"
              onClick={() => setOpen(expanded ? null : section.id)}
            >
              <span>{section.title}</span>
              <span
                aria-hidden
                className={cn(
                  "text-muted transition-transform",
                  expanded && "rotate-180",
                )}
              >
                ▾
              </span>
            </button>
            {expanded ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="space-y-2 px-3 pb-3 pt-1 text-sm text-muted"
              >
                {section.body.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Exclusive open helper (pure) for tests. */
export function babyCareGuidelinesNextOpen(
  current: BabyCareGuidelineSectionId | null,
  pressed: BabyCareGuidelineSectionId,
): BabyCareGuidelineSectionId | null {
  return current === pressed ? null : pressed;
}
