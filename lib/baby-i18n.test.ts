import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { babyLocaleFromCookieHeader, lookupBabyMessage, t } from "@/lib/baby-i18n";
import { babyEn } from "@/messages/baby/en";
import { babyVi } from "@/messages/baby/vi";

describe("baby i18n t()", () => {
  it("returns Vietnamese for home.logFeed", () => {
    assert.equal(t("home.logFeed", "vi"), "Ghi bú");
  });

  it("falls back to en when key missing from locale", () => {
    const viCopy = { ...babyVi };
    delete viCopy["home.logFeed"];
    assert.equal(
      lookupBabyMessage("home.logFeed", "vi", { en: babyEn, vi: viCopy }),
      "Log feed",
    );
    // Shared module map unchanged
    assert.equal(babyVi["home.logFeed"], "Ghi bú");
    assert.equal(t("home.logFeed", "vi"), "Ghi bú");
  });

  it("returns key string when missing from all locales", () => {
    assert.equal(t("missing.key.xyz", "vi"), "missing.key.xyz");
    assert.equal(t("home.logFeed", "en"), "Log feed");
  });

  it("parses baby_locale from cookie header", () => {
    assert.equal(
      babyLocaleFromCookieHeader("foo=1; baby_locale=vi; bar=2"),
      "vi",
    );
    assert.equal(babyLocaleFromCookieHeader(null), "en");
  });

  it("summary keys exist in EN and VI", () => {
    assert.ok(t("summary.feed", "en").includes("{method}"));
    assert.ok(t("summary.feedStarted", "en").includes("Started feed"));
    assert.ok(t("summary.feedEnded", "vi").includes("Kết thúc bú"));
    assert.equal(t("summary.sleepStarted", "en"), "Started sleep");
    assert.equal(t("summary.sleepEnded", "en"), "Ended sleep");
    assert.equal(t("nav.label", "vi"), "Chăm bé");
  });

  it("common.failed and timeline.sourceTelegram exist in EN and VI", () => {
    assert.equal(t("common.failed", "en"), "Failed");
    assert.equal(t("common.failed", "vi"), "Thất bại");
    assert.equal(t("timeline.sourceTelegram", "en"), " · Telegram");
    assert.ok(t("timeline.sourceTelegram", "vi").length > 0);
    assert.notEqual(t("timeline.sourceTelegram", "vi"), "timeline.sourceTelegram");
  });

  it("sleep open-check error/retry keys exist in EN and VI", () => {
    assert.ok(t("sleep.checkFailed", "en").length > 0);
    assert.ok(t("sleep.checkFailed", "vi").length > 0);
    assert.notEqual(t("sleep.checkFailed", "vi"), "sleep.checkFailed");
    assert.equal(t("sleep.retryCheck", "en"), "Retry");
    assert.equal(t("sleep.retryCheck", "vi"), "Thử lại");
    assert.ok(t("sleep.checkIncomplete", "en").length > 0);
    assert.ok(t("sleep.checkIncomplete", "vi").length > 0);
    assert.notEqual(t("sleep.checkIncomplete", "vi"), "sleep.checkIncomplete");
  });

  it("home last-care status keys exist in EN and VI", () => {
    assert.equal(t("home.statusHeading", "en"), "Last care");
    assert.equal(t("home.statusEmpty", "en"), "Not logged yet");
    assert.equal(
      t("home.statusError", "en"),
      "Could not load. You can still log care below.",
    );
    assert.equal(t("home.statusInProgress", "en"), "Napping now");
    assert.equal(t("home.whenJustNow", "en"), "Just now");
    assert.equal(t("home.whenMinutes", "en"), "{n} min ago");
    assert.equal(t("home.statusHeading", "vi"), "Lần chăm gần nhất");
    assert.equal(t("home.statusEmpty", "vi"), "Chưa ghi");
    assert.equal(
      t("home.statusError", "vi"),
      "Không tải được. Bạn vẫn có thể ghi bên dưới.",
    );
    assert.equal(t("home.statusInProgress", "vi"), "Đang ngủ");
    assert.equal(t("home.whenMinutes", "vi"), "{n} phút trước");

    assert.ok(t("home.statusFeed", "vi").length > 0);
    assert.ok(t("home.statusSleep", "vi").length > 0);
    assert.ok(t("home.statusDiaper", "vi").length > 0);
    assert.ok(t("home.statusHint", "en").length > 0);
    assert.ok(t("home.logDiaper", "vi").length > 0);
  });

  it("insights and measure keys exist in EN and VI", () => {
    assert.equal(t("insights.title", "en"), "Insights");
    assert.equal(t("measure.title", "en"), "Log measurement");
    assert.equal(t("home.logMeasure", "en"), "Log measurement");
    assert.ok(t("insights.about", "en").length > 0);
    assert.ok(t("insights.emptyGrowth", "vi").length > 0);
    assert.ok(t("insights.emptyTimeline", "vi").length > 0);
    assert.ok(t("insights.careCountHeading", "en").length > 0);
    assert.ok(t("insights.emptyCareCount", "vi").length > 0);
    assert.ok(t("insights.partialCareCount", "en").length > 0);
    assert.ok(t("insights.partialCareCount", "vi").length > 0);
    assert.ok(t("insights.partialCareCountCapped", "en").length > 0);
    assert.ok(t("insights.partialGrowth", "en").length > 0);
    assert.ok(t("insights.partialGrowth", "vi").length > 0);
    assert.ok(t("insights.partialGrowthCapped", "vi").length > 0);
    assert.ok(t("insights.showMoreList", "en").length > 0);
    assert.ok(t("insights.showMoreList", "vi").length > 0);
    assert.ok(t("vaccine.partialList", "en").length > 0);
    assert.ok(t("vaccine.partialList", "vi").length > 0);
    assert.ok(t("vaccine.partialListCapped", "en").length > 0);
    assert.ok(t("vaccine.partialListCapped", "vi").length > 0);
    assert.equal(t("vaccine.title", "en"), "Vaccines");
    assert.equal(t("vaccine.doseFirst", "vi"), "Mũi 1");
    assert.equal(t("insights.title", "vi"), "Thống kê");
    assert.equal(t("measure.title", "vi"), "Ghi cân đo");
    assert.notEqual(t("insights.kpiFeeds", "vi"), "insights.kpiFeeds");
  });
});
