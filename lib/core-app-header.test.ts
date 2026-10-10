import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCoreAppHeader } from "@/lib/core-app-header";

describe("resolveCoreAppHeader", () => {
  it("keeps kiosk home unchanged", () => {
    const resolved = resolveCoreAppHeader("/kiosk");
    assert.equal(resolved.title, "Kiosk");
    assert.deepEqual(resolved.breadcrumbs, []);
    assert.equal(resolved.meta, "Today at a glance");
    assert.equal(resolved.cta, null);
  });

  it("resolves kiosk weather with crumbs and default meta", () => {
    const resolved = resolveCoreAppHeader("/kiosk/weather");
    assert.equal(resolved.title, "Weather");
    assert.deepEqual(resolved.breadcrumbs, [
      { label: "Kiosk", href: "/kiosk" },
      { label: "Weather" },
    ]);
    assert.equal(resolved.meta, "Hourly outlook");
    assert.equal(resolved.cta, null);
  });

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
});
