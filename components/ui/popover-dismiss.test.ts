import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachPopoverDocumentDismiss } from "@/components/ui/popover-dismiss";

type Listener = (e: Event) => void;

function createFakeDocument() {
  const byType = new Map<string, Set<{ fn: Listener; capture: boolean }>>();

  const document = {
    addEventListener(
      type: string,
      fn: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      const capture =
        typeof options === "boolean" ? options : Boolean(options?.capture);
      const handler = fn as Listener;
      const set = byType.get(type) ?? new Set();
      set.add({ fn: handler, capture });
      byType.set(type, set);
    },
    removeEventListener(
      type: string,
      fn: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) {
      const capture =
        typeof options === "boolean" ? options : Boolean(options?.capture);
      const set = byType.get(type);
      if (!set) return;
      for (const entry of set) {
        if (entry.fn === fn && entry.capture === capture) set.delete(entry);
      }
    },
    dispatch(type: string, event: Event) {
      const set = byType.get(type);
      if (!set) return;
      for (const { fn } of set) fn(event);
    },
    listenerCount(type: string) {
      return byType.get(type)?.size ?? 0;
    },
  };

  return document;
}

describe("attachPopoverDocumentDismiss", () => {
  it("open + Escape → onClose synchronously (no setTimeout gap)", () => {
    const doc = createFakeDocument();
    let closed = false;

    attachPopoverDocumentDismiss({
      document: doc,
      onClose: () => {
        closed = true;
      },
      isInside: () => false,
      shouldIgnoreOutside: () => false,
    });

    assert.equal(
      doc.listenerCount("keydown"),
      1,
      "keydown must register immediately on attach",
    );

    const escapeEvent = {
      key: "Escape",
      preventDefault() {},
    } as unknown as KeyboardEvent;

    // Same turn as attach — mirrors Playwright Escape right after panel paint.
    doc.dispatch("keydown", escapeEvent);
    assert.equal(closed, true);
  });

  it("non-Escape keydown does not close", () => {
    const doc = createFakeDocument();
    let closed = false;
    attachPopoverDocumentDismiss({
      document: doc,
      onClose: () => {
        closed = true;
      },
      isInside: () => false,
      shouldIgnoreOutside: () => false,
    });
    doc.dispatch("keydown", { key: "Enter", preventDefault() {} } as Event);
    assert.equal(closed, false);
  });
});
