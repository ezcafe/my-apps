import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCoreAppHeader } from "@/lib/core-app-header";

describe("resolveCoreAppHeader", () => {
  it("resolves help with CTA", () => {
    const resolved = resolveCoreAppHeader("/help");
    assert.equal(resolved.title, "API help");
    assert.ok(resolved.cta);
    assert.equal(resolved.cta?.href, "/settings#settings-api-tokens");
  });

  it("falls back to settings for unknown paths", () => {
    const resolved = resolveCoreAppHeader("/unknown");
    assert.equal(resolved.title, "Settings");
  });

  it("does not keep retired kiosk headers", () => {
    const home = resolveCoreAppHeader("/kiosk");
    assert.equal(home.title, "Settings");
    const weather = resolveCoreAppHeader("/kiosk/weather");
    assert.equal(weather.title, "Settings");
  });
});
