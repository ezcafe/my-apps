import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveModalChromeMode } from "@/components/ui/modal";

describe("resolveModalChromeMode", () => {
  it("keeps bare layout for table / full-bleed shells", () => {
    assert.equal(resolveModalChromeMode({ bare: true }), "bare");
    assert.equal(
      resolveModalChromeMode({ bare: true, title: "Ignored" }),
      "bare",
    );
  });

  it("uses titled scroll chrome when title is set", () => {
    assert.equal(
      resolveModalChromeMode({ title: "Edit transaction" }),
      "titled-scroll",
    );
  });

  it("still scrolls when labelledBy-only (no title, not bare)", () => {
    // Regression: labelledBy without title used to fall into bare overflow-hidden
    // and clip action buttons on tall forms (e.g. baby insights edit).
    assert.equal(resolveModalChromeMode({}), "untitled-scroll");
    assert.equal(
      resolveModalChromeMode({ title: null }),
      "untitled-scroll",
    );
    assert.equal(
      resolveModalChromeMode({ bare: false, title: undefined }),
      "untitled-scroll",
    );
  });
});
