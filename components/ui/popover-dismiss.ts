/**
 * Document-level dismiss for Popover / MoreMenu.
 * Escape must register synchronously (no setTimeout) so open→Escape
 * cannot race (Playwright presses Escape as soon as the panel paints).
 */

export type PopoverDismissDocument = Pick<
  Document,
  "addEventListener" | "removeEventListener"
>;

export function attachPopoverDocumentDismiss(input: {
  document: PopoverDismissDocument;
  onClose: () => void;
  /** True when the event target is inside trigger root or panel. */
  isInside: (target: Node) => boolean;
  /** True while the opening gesture should ignore outside mousedown. */
  shouldIgnoreOutside: () => boolean;
}): () => void {
  const { document: doc, onClose, isInside, shouldIgnoreOutside } = input;

  const onDoc = (e: Event) => {
    if (shouldIgnoreOutside()) return;
    const target = e.target;
    if (!(target instanceof Node)) return;
    if (isInside(target)) return;
    onClose();
  };

  const onKey = (e: Event) => {
    if (!isEscapeKey(e)) return;
    if ("preventDefault" in e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    onClose();
  };

  // Capture Escape so dismiss still runs if a focused control stops bubble.
  doc.addEventListener("keydown", onKey, true);
  doc.addEventListener("mousedown", onDoc);

  return () => {
    doc.removeEventListener("keydown", onKey, true);
    doc.removeEventListener("mousedown", onDoc);
  };
}

function isEscapeKey(e: Event): boolean {
  return "key" in e && (e as { key?: string }).key === "Escape";
}
