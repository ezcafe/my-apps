import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isShellNavActive, shellNavItems } from "@/lib/features/registry";

describe("kiosk registry", () => {
  it("registers Kiosk with prefix active match", () => {
    const kiosk = shellNavItems.find((item) => item.id === "kiosk");
    assert.ok(kiosk, "expected kiosk nav item");
    assert.equal(kiosk.kind, "core");
    if (kiosk.kind !== "core") return;
    assert.equal(kiosk.activeMatch, "prefix");
    assert.equal(kiosk.href, "/kiosk");
  });

  it("marks kiosk active on weather sub-route but not typos", () => {
    const kiosk = shellNavItems.find((item) => item.id === "kiosk");
    assert.ok(kiosk);
    assert.equal(isShellNavActive(kiosk!, "/kiosk/weather"), true);
    assert.equal(isShellNavActive(kiosk!, "/kiosk"), true);
    assert.equal(isShellNavActive(kiosk!, "/kioskx"), false);
  });
});
