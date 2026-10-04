import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("Kiosk first-load slim checks", () => {
  it("kiosk dashboard keeps insight stats behind next/dynamic", () => {
    const src = readFileSync(
      join(process.cwd(), "components/kiosk/kiosk-dashboard.tsx"),
      "utf8",
    );
    assert.match(src, /dynamic\(\(\) =>/);
    assert.match(src, /loans-insights-stats/);
    assert.match(src, /investment-insights-stats/);
  });

  it("PERFORMANCE.md records kiosk client chunk baseline", () => {
    const doc = readFileSync(join(process.cwd(), "docs/PERFORMANCE.md"), "utf8");
    assert.match(doc, /\/kiosk/);
    assert.match(doc, /Kiosk/);
    // Must not still say only “measure after change” without a number or note.
    assert.doesNotMatch(
      doc,
      /\|\s*`\/kiosk`\s*\|\s*\(measure after change\)/,
    );
  });
});
