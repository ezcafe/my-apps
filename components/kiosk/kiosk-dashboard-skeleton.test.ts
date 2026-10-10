import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KioskDashboardSkeleton } from "@/components/kiosk/kiosk-dashboard-skeleton";

describe("KioskDashboardSkeleton band order", () => {
  it("places attention list band before metrics grid", () => {
    const html = renderToStaticMarkup(createElement(KioskDashboardSkeleton));
    const attention = html.indexOf('aria-label="Loading loan payments"');
    const metrics = html.indexOf('aria-label="Loading money metrics"');
    const strip = html.indexOf('aria-label="Loading today and weather"');
    assert.ok(strip >= 0, "expected context strip marker");
    assert.ok(attention >= 0, "expected attention list marker");
    assert.ok(metrics >= 0, "expected metrics marker");
    assert.ok(strip < attention && attention < metrics);
  });
});
