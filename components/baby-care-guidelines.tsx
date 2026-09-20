"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BabyCareGuidelineModel } from "@/lib/baby-care-guideline-content";

type BabyCareGuidelinesProps = {
  model: BabyCareGuidelineModel;
  className?: string;
};

function GuideLines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  if (lines.length === 1) {
    return <p className="text-sm text-muted">{lines[0]}</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
      {lines.map((line) => (
        <li key={line.slice(0, 48)}>{line}</li>
      ))}
    </ul>
  );
}

function GuideSectionSummary({ children }: { children: ReactNode }) {
  return (
    <summary
      className={cn(
        "flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-medium text-foreground/80",
        "transition-colors hover:text-foreground",
        "[&::-webkit-details-marker]:hidden",
      )}
    >
      <span>{children}</span>
      <span
        aria-hidden
        data-guide-section-chevron=""
        className="inline-block text-muted transition-transform group-open:rotate-180"
      >
        ▾
      </span>
    </summary>
  );
}

/**
 * Quiet care guideline — Section I, Section II, and each developmental stage
 * are independent collapsibles (`<details>`), all collapsed by default.
 */
export function BabyCareGuidelines({
  model,
  className,
}: BabyCareGuidelinesProps) {
  return (
    <div
      data-testid="baby-care-guidelines"
      data-section="guidelines"
      data-guide-mode={model.mode}
      className={cn(
        "space-y-1 rounded-[var(--radius-md)] border border-border/60 bg-surface p-3 text-muted",
        className,
      )}
    >
      {model.mode === "placeholder" ? (
        <div data-guide-block="placeholder" className="space-y-2">
          <p className="text-sm font-medium text-foreground/80">
            {model.sectionI.title}
          </p>
          <p className="text-sm">{model.placeholder}</p>
        </div>
      ) : (
        <>
          <details
            data-guide-block="section-i"
            data-guide-section-collapsed=""
            className="group"
          >
            <GuideSectionSummary>{model.sectionI.title}</GuideSectionSummary>
            <div data-guide-section-body="" className="space-y-2 pb-3">
              {model.sectionI.intro ? (
                <p className="text-sm">{model.sectionI.intro}</p>
              ) : null}
              {model.sectionI.roomTempTitle ? (
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground/70">
                    {model.sectionI.roomTempTitle}
                  </h3>
                  <p className="text-sm">{model.sectionI.roomTemp}</p>
                </div>
              ) : null}
              {model.sectionI.bodyTempTitle ? (
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground/70">
                    {model.sectionI.bodyTempTitle}
                  </h3>
                  <GuideLines lines={model.sectionI.bodyTempLines} />
                </div>
              ) : null}
              {model.sectionI.sidsTitle ? (
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground/70">
                    {model.sectionI.sidsTitle}
                  </h3>
                  <p className="text-sm">{model.sectionI.sids}</p>
                </div>
              ) : null}
            </div>
          </details>

          <details
            data-guide-block="section-ii"
            data-guide-section-collapsed=""
            className="group border-t border-border/40"
          >
            <GuideSectionSummary>{model.sectionIITitle}</GuideSectionSummary>
            <div data-guide-section-body="" className="space-y-1 pb-1">
              {model.stages.map((stage) => (
                <details
                  key={stage.id}
                  data-guide-stage={stage.id}
                  data-guide-stage-collapsed=""
                  className="group/stage border-t border-border/40 first:border-t-0"
                >
                  <summary
                    className={cn(
                      "flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-medium text-foreground/75",
                      "transition-colors hover:text-foreground",
                      "[&::-webkit-details-marker]:hidden",
                    )}
                  >
                    <span>{stage.title}</span>
                    <span
                      aria-hidden
                      data-guide-stage-chevron=""
                      className="inline-block text-muted transition-transform group-open/stage:rotate-180"
                    >
                      ▾
                    </span>
                  </summary>
                  <div
                    data-guide-stage-body=""
                    className="space-y-2 pb-3 pl-0.5"
                  >
                    {stage.subsections.map((sub) => (
                      <div
                        key={sub.id}
                        data-guide-subsection={sub.id}
                        className="space-y-1"
                      >
                        <h4 className="text-sm font-medium text-foreground/65">
                          {sub.title}
                        </h4>
                        <GuideLines lines={sub.lines} />
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        </>
      )}

      <p data-guide-caveat="" className="border-t border-border/40 pt-3 text-xs text-muted">
        {model.caveat}
      </p>
    </div>
  );
}
