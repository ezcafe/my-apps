import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_MONEY_SECTION_TAB_VISIBILITY,
  MONEY_OPTIONAL_SECTION_TAB_KEYS,
  parseMoneySectionTabVisibility,
  serializeMoneySectionTabVisibility,
} from "@/lib/money-section-tab-visibility";

describe("DEFAULT_MONEY_SECTION_TAB_VISIBILITY", () => {
  it("defaults all optional tabs to false", () => {
    for (const key of MONEY_OPTIONAL_SECTION_TAB_KEYS) {
      assert.equal(DEFAULT_MONEY_SECTION_TAB_VISIBILITY[key], false);
    }
  });

  it("only includes optional keys (never always-on tabs)", () => {
    assert.deepEqual(Object.keys(DEFAULT_MONEY_SECTION_TAB_VISIBILITY).sort(), [
      ...MONEY_OPTIONAL_SECTION_TAB_KEYS,
    ].sort());
    assert.ok(!("new" in DEFAULT_MONEY_SECTION_TAB_VISIBILITY));
    assert.ok(!("analytics" in DEFAULT_MONEY_SECTION_TAB_VISIBILITY));
    assert.ok(!("spending" in DEFAULT_MONEY_SECTION_TAB_VISIBILITY));
    assert.ok(!("settings" in DEFAULT_MONEY_SECTION_TAB_VISIBILITY));
  });
});

describe("parseMoneySectionTabVisibility", () => {
  it("returns defaults for null/empty/invalid", () => {
    assert.deepEqual(
      parseMoneySectionTabVisibility(null),
      DEFAULT_MONEY_SECTION_TAB_VISIBILITY,
    );
    assert.deepEqual(
      parseMoneySectionTabVisibility(""),
      DEFAULT_MONEY_SECTION_TAB_VISIBILITY,
    );
    assert.deepEqual(
      parseMoneySectionTabVisibility("not-json"),
      DEFAULT_MONEY_SECTION_TAB_VISIBILITY,
    );
    assert.deepEqual(
      parseMoneySectionTabVisibility("[]"),
      DEFAULT_MONEY_SECTION_TAB_VISIBILITY,
    );
  });

  it("ignores unknown keys and coerces non-booleans", () => {
    const parsed = parseMoneySectionTabVisibility(
      JSON.stringify({
        bills: true,
        savings: "yes",
        loans: 1,
        import: null,
        new: true,
        settings: true,
        extra: true,
      }),
    );
    assert.equal(parsed.bills, true);
    assert.equal(parsed.savings, false);
    assert.equal(parsed.import, false);
    assert.ok(!("loans" in parsed));
    assert.ok(!("new" in parsed));
    assert.ok(!("settings" in parsed));
    assert.ok(!("extra" in parsed));
  });
});

describe("serializeMoneySectionTabVisibility", () => {
  it("round-trips with parse", () => {
    const input = {
      bills: true,
      savings: false,
      import: true,
    };
    const roundTripped = parseMoneySectionTabVisibility(
      serializeMoneySectionTabVisibility(input),
    );
    assert.deepEqual(roundTripped, input);
  });
});
