import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shellNavItems } from "@/lib/features/registry";

describe("kiosk registry", () => {
  it("does not register a Kiosk nav item", () => {
    const kiosk = shellNavItems.find((item) => item.id === "kiosk");
    assert.equal(kiosk, undefined);
  });

  it("keeps Money as the first useful shell item", () => {
    assert.equal(shellNavItems[0]?.id, "money");
    assert.equal(shellNavItems[0]?.href, "/money");
  });
});
