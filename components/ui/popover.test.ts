import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

describe("Popover Escape dismiss wiring", () => {
  it("registers Escape via attachPopoverDocumentDismiss (sync; not setTimeout-deferred)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/ui/popover.tsx"),
      "utf8",
    );
    assert.match(
      src,
      /attachPopoverDocumentDismiss/,
      "Popover must use sync document dismiss helper so Escape cannot race panel paint",
    );
    // Guard regression: keydown must not be nested only inside setTimeout
    const dismissEffect = src.match(
      /useEffect\(\(\) => \{[\s\S]*?\[open, isControlled, triggerShown\]\)/,
    );
    assert.ok(dismissEffect, "expected open dismiss useEffect");
    const body = dismissEffect[0];
    assert.doesNotMatch(
      body,
      /setTimeout\(\(\) => \{[\s\S]*addEventListener\("keydown"/,
      "Escape keydown must not be deferred behind setTimeout(0)",
    );
  });
});
