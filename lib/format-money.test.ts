import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fxRateInputAddons, getCurrencySymbol } from "@/lib/format-money";

describe("fxRateInputAddons", () => {
  it("formats USD → VND as $1 = …₫", () => {
    assert.deepEqual(fxRateInputAddons("USD", "VND"), {
      leading: "$1 =",
      trailing: "\u20AB",
    });
  });

  it("uses currency symbols for other pairs", () => {
    const from = getCurrencySymbol("EUR");
    const to = getCurrencySymbol("USD");
    assert.deepEqual(fxRateInputAddons("EUR", "USD"), {
      leading: `${from}1 =`,
      trailing: to,
    });
  });
});
