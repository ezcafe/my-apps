import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(
  join(process.cwd(), "components/money-section-tabs.tsx"),
  "utf8",
);

describe("MoneyAppMenu grouped drawer (source contract)", () => {
  it("renders groups via appSectionItemsByGroup and APP_NAV_GROUP_LABELS", () => {
    assert.match(source, /appSectionItemsByGroup/);
    assert.match(source, /APP_NAV_GROUP_LABELS/);
    assert.match(source, /Other apps/);
  });

  it("keeps current-app panel without app title heading when grouped", () => {
    assert.match(source, /showAppHeading=\{false\}/);
    assert.match(
      source,
      /showAppHeading\s*=\s*false/,
    );
  });
});
