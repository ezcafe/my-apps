import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_KIOSK_WIDGETS,
  normalizeKioskWidgets,
  resolveKioskWidgets,
} from "@/lib/kiosk/widget-registry";

describe("kiosk widget registry", () => {
  it("defaults match current home dashboard widgets", () => {
    assert.deepEqual(DEFAULT_KIOSK_WIDGETS, [
      "context.today_weather",
      "money.net_month",
      "loans.payments",
    ]);
  });

  it("normalizes unknown ids and preserves registry order", () => {
    assert.deepEqual(
      normalizeKioskWidgets([
        "savings.summary",
        "unknown.widget",
        "money.net_month",
        "money.net_month",
        "context.today_weather",
      ]),
      ["context.today_weather", "money.net_month", "savings.summary"],
    );
  });

  it("resolveKioskWidgets uses defaults when stored is null", () => {
    assert.deepEqual(resolveKioskWidgets(null), DEFAULT_KIOSK_WIDGETS);
    assert.deepEqual(resolveKioskWidgets(undefined), DEFAULT_KIOSK_WIDGETS);
  });

  it("resolveKioskWidgets allows empty kiosk", () => {
    assert.deepEqual(resolveKioskWidgets([]), []);
  });
});
