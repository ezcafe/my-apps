import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BABY_HOME_ACTIONS } from "@/lib/baby-home-actions";
import { t } from "@/lib/baby-i18n";

/**
 * No RTL lib in repo — cover the three home CTAs the UI maps over
 * (hrefs + EN/VI labels).
 */
describe("baby home actions", () => {
  it("exposes primary actions with EN labels", () => {
    assert.equal(BABY_HOME_ACTIONS.length, 4);
    assert.deepEqual(
      BABY_HOME_ACTIONS.map((a) => a.en),
      ["Log feed", "Log nap", "Log diaper", "Log measurement"],
    );
    assert.deepEqual(
      BABY_HOME_ACTIONS.map((a) => a.href),
      ["/baby/feed", "/baby/sleep", "/baby/diaper", "/baby/measure"],
    );
  });

  it("resolves EN and VI labels for all actions", () => {
    for (const action of BABY_HOME_ACTIONS) {
      assert.equal(t(action.labelKey, "en"), action.en);
      assert.ok(t(action.labelKey, "vi").length > 0);
      assert.notEqual(t(action.labelKey, "vi"), action.labelKey);
    }
    assert.equal(t("home.logFeed", "vi"), "Ghi bú");
    assert.equal(t("home.logNap", "vi"), "Ghi ngủ");
    assert.equal(t("home.logDiaper", "vi"), "Ghi tã");
    assert.equal(t("home.logMeasure", "vi"), "Ghi cân đo");
  });
});
