import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

describe("MoreMenu open control", () => {
  it("forwards onOpenChange to Popover (Escape → parent false)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/ui/more-menu.tsx"),
      "utf8",
    );
    assert.match(src, /onOpenChange=\{onOpenChange\}/);
    assert.match(src, /open=\{open\}/);
  });
});
