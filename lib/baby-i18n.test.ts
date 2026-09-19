import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { babyLocaleFromCookieHeader, lookupBabyMessage, t } from "@/lib/baby-i18n";
import { babyEn } from "@/messages/baby/en";
import { babyVi } from "@/messages/baby/vi";

describe("baby i18n t()", () => {
  it("returns Vietnamese for home.formula", () => {
    assert.equal(t("home.formula", "vi"), "Bình sữa");
  });

  it("falls back to en when key missing from locale", () => {
    const viCopy = { ...babyVi };
    delete viCopy["home.formula"];
    assert.equal(
      lookupBabyMessage("home.formula", "vi", { en: babyEn, vi: viCopy }),
      "Bottle",
    );
    assert.equal(babyVi["home.formula"], "Bình sữa");
    assert.equal(t("home.formula", "vi"), "Bình sữa");
  });

  it("returns key string when missing from all locales", () => {
    assert.equal(t("missing.key.xyz", "vi"), "missing.key.xyz");
    assert.equal(t("home.formula", "en"), "Bottle");
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

  it("home last-care and quick-care keys exist in EN and VI", () => {
    assert.equal(t("home.statusHeading", "en"), "Last care");
    assert.equal(t("home.status.feedEmpty", "en"), "No feed logged yet.");
    assert.equal(t("home.status.feedEmpty", "vi"), "Chưa ghi lần bú nào.");
    assert.match(t("home.header.breastNext", "en"), /Next feed is in about/);
    assert.match(t("home.header.breastNext", "vi"), /Lần bú tiếp theo còn khoảng/);
    assert.equal(t("home.nextIn", "en"), "next in {duration}");
    assert.equal(
      t("home.nextIn", "vi"),
      "lần tiếp theo trong {duration}",
    );
    assert.equal(t("home.overdue", "vi"), "{duration} quá hạn");
    assert.equal(t("home.whenMinutes.inline", "en"), "about {n} minutes ago");
    assert.equal(
      t("home.whenMinutes.inline", "vi"),
      "khoảng {n} phút trước",
    );
    assert.equal(t("diaper.dirty", "en"), "Poop Only");
    assert.equal(t("diaper.dirty", "vi"), "Chỉ phân");
    assert.equal(t("diaper.dry", "en"), "Dry");
    assert.equal(t("diaper.dry", "vi"), "Khô");
    assert.equal(t("home.done", "en"), "Done");
    assert.equal(t("home.done", "vi"), "Xong");
    assert.equal(t("home.logged", "en"), "Logged");
    assert.equal(t("home.logged", "vi"), "Đã ghi");
    assert.equal(t("home.diaperTileWet", "en"), "Wet");
    assert.equal(t("home.diaperTileWet", "vi"), "Ướt");
    assert.equal(t("home.diaperTilePoop", "en"), "Poop");
    assert.equal(t("home.diaperTilePoop", "vi"), "Phân");
    assert.equal(t("home.diaperTileMixed", "en"), "Mixed");
    assert.equal(t("home.diaperTileMixed", "vi"), "Hỗn hợp");
    assert.equal(t("home.diaperTileDry", "en"), "Dry");
    assert.equal(t("home.diaperTileDry", "vi"), "Khô");
    assert.ok(t("diaper.colorRedFlagWarn", "en").length > 0);
    assert.ok(t("diaper.colorRedFlagWarn", "vi").length > 0);
    assert.notEqual(t("diaper.colorRedFlagWarn", "vi"), "diaper.colorRedFlagWarn");
    assert.ok(t("diaper.textureCautionWarn", "en").length > 0);
    assert.ok(t("diaper.textureCautionWarn", "vi").length > 0);
    assert.notEqual(
      t("diaper.textureCautionWarn", "vi"),
      "diaper.textureCautionWarn",
    );
    assert.equal(t("home.formulaCustomUnder", "en"), "Custom ml");
    assert.equal(t("home.formulaCustomUnder", "vi"), "Nhập ml");
    assert.equal(t("home.chainFailed", "en"), "Nothing was saved. Try again.");
    assert.equal(t("home.saving", "en"), "Saving…");
    assert.ok(t("home.statusFeed", "vi").length > 0);
    assert.ok(t("home.pendingTitle", "vi").length > 0);
    assert.ok(t("home.pendingRetry", "en").length > 0);
    assert.ok(t("home.pendingRetry", "vi").length > 0);
    assert.ok(t("home.pendingDiscard", "en").length > 0);
    assert.ok(t("home.pendingDiscard", "vi").length > 0);
    assert.ok(t("home.pendingTooOld", "en").length > 0);
    assert.ok(t("home.pendingTooOld", "vi").length > 0);
    assert.ok(t("home.pendingTimelineLink", "en").length > 0);
    assert.ok(t("home.pendingTimelineLink", "vi").length > 0);
    assert.ok(t("settings.birthDate", "en").length > 0);
    assert.ok(t("settings.birthDateInvalid", "vi").length > 0);
  });

  it("insights and growth keys exist in EN and VI", () => {
    assert.equal(t("insights.title", "en"), "Insights");
    assert.equal(t("growth.title", "en"), "Log growth");
    assert.equal(t("vaccine.title", "en"), "Vaccine");
    assert.doesNotMatch(t("vaccine.title", "en"), /Log vaccines/i);
    assert.equal(t("growth.vaccine", "en"), "Vaccine");
    assert.ok(!("vaccine.logOnGrowth" in babyEn));
    assert.ok(!("vaccine.readOnlyHint" in babyEn));
    assert.ok(!("vaccine.logOnGrowth" in babyVi));
    assert.ok(!("vaccine.readOnlyHint" in babyVi));
    assert.ok(t("insights.about", "en").length > 0);
    assert.doesNotMatch(t("insights.about", "en"), /timeline/i);
    assert.doesNotMatch(t("insights.about", "en"), /\bMeasure\b/);
    assert.doesNotMatch(t("insights.about", "vi"), /dòng thời gian/i);
    assert.equal(t("activities.loadError", "en"), "Could not load activities.");
    assert.equal(t("activities.loadError", "vi"), "Không tải được hoạt động.");
    assert.ok(t("insights.emptyGrowth", "vi").length > 0);
    assert.equal(t("insights.title", "vi"), "Thống kê");
    assert.equal(t("growth.title", "vi"), "Ghi cân đo");
    assert.equal(t("vaccine.title", "vi"), "Vắc-xin");
    assert.doesNotMatch(t("vaccine.title", "vi"), /Ghi vắc-xin/i);
    assert.notEqual(t("insights.kpiFeeds", "vi"), "insights.kpiFeeds");
    assert.equal(t("insights.filterCare", "en"), "Care types");
    assert.notEqual(t("insights.filterCare", "vi"), "insights.filterCare");
    assert.equal(t("insights.nightRestTitle", "en"), "Night Rest");
    assert.match(t("insights.nightRestPurpose", "en"), /not efficiency/i);
    assert.doesNotMatch(t("insights.nightRestTitle", "en"), /efficiency/i);
    assert.notEqual(
      t("insights.nightRestTitle", "vi"),
      "insights.nightRestTitle",
    );
    assert.notEqual(t("insights.moreInsights", "vi"), "insights.moreInsights");
    assert.notEqual(t("insights.activityLog", "vi"), "insights.activityLog");
    assert.equal(t("insights.editInvalidStart", "en"), "Invalid start time");
    assert.equal(
      t("insights.editEndBeforeStart", "en"),
      "End time must be after start",
    );
    assert.notEqual(
      t("insights.editEndBeforeStart", "vi"),
      "insights.editEndBeforeStart",
    );
    assert.notEqual(
      t("insights.hydrationWetLegend", "vi"),
      "insights.hydrationWetLegend",
    );
    assert.notEqual(
      t("insights.diaperBucketBlowouts", "vi"),
      "insights.diaperBucketBlowouts",
    );
    assert.notEqual(
      t("insights.nightRestBlocks", "vi"),
      "insights.nightRestBlocks",
    );
    assert.equal(t("insights.selectionEdit", "en"), "Edit");
    assert.equal(t("insights.selectionDelete", "en"), "Delete");
    assert.equal(t("insights.selectionClear", "en"), "Clear");
    assert.match(t("insights.selectionCountOne", "en"), /activity selected/i);
    assert.match(t("insights.selectionCountMany", "en"), /\{n\}/);
    assert.match(t("insights.selectionDeleteConfirmMany", "en"), /\{n\}/);
    assert.ok(t("insights.selectionDeletePartialFail", "en").length > 0);
    assert.equal(
      t("insights.selectionDeleteAllFail", "en"),
      "Couldn’t delete activities.",
    );
    assert.notEqual(
      t("insights.selectionDeleteAllFail", "vi"),
      "insights.selectionDeleteAllFail",
    );
    assert.notEqual(
      t("insights.selectionToolbar", "vi"),
      "insights.selectionToolbar",
    );
    assert.notEqual(
      t("insights.selectionDeleteConfirmOne", "vi"),
      "insights.selectionDeleteConfirmOne",
    );
    assert.notEqual(
      t("insights.selectionDeletePartialFail", "vi"),
      "insights.selectionDeletePartialFail",
    );
    assert.doesNotMatch(t("insights.selectionCountMany", "en"), /transaction/i);
    assert.doesNotMatch(t("insights.selectionToolbar", "en"), /transaction/i);
  });

  it("insights empty copy guides caregivers to widen the date filter", () => {
    const emptyGrowthEn = t("insights.emptyGrowth", "en");
    const emptyTimelineEn = t("insights.emptyTimeline", "en");
    const emptyGrowthVi = t("insights.emptyGrowth", "vi");
    const emptyTimelineVi = t("insights.emptyTimeline", "vi");

    // Next-action sentence must include both ideas (widen range + Apply), not one token.
    assert.match(emptyGrowthEn, /Widen/i);
    assert.match(emptyGrowthEn, /Apply/i);
    assert.match(emptyTimelineEn, /Widen/i);
    assert.match(emptyTimelineEn, /Apply/i);
    assert.match(emptyGrowthVi, /Mở rộng/i);
    assert.match(emptyGrowthVi, /Áp dụng/i);
    assert.match(emptyTimelineVi, /Mở rộng/i);
    assert.match(emptyTimelineVi, /Áp dụng/i);
  });

  it("growth chart empty stays short without list recovery guidance", () => {
    const chartEn = t("insights.emptyGrowthChart", "en");
    const chartVi = t("insights.emptyGrowthChart", "vi");
    assert.ok(chartEn.length > 0);
    assert.ok(chartVi.length > 0);
    assert.notEqual(chartEn, "insights.emptyGrowthChart");
    assert.notEqual(chartVi, chartEn);
    // List recovery (Widen / Apply) belongs on emptyGrowth only.
    assert.doesNotMatch(chartEn, /Widen/i);
    assert.doesNotMatch(chartEn, /Apply/i);
    assert.doesNotMatch(chartVi, /Mở rộng/i);
    assert.doesNotMatch(chartVi, /Áp dụng/i);
  });

  it("insights.sourceWeb is localized in VI (not English Web)", () => {
    assert.equal(t("insights.sourceWeb", "en"), "Web");
    assert.notEqual(t("insights.sourceWeb", "vi"), "Web");
    assert.notEqual(t("insights.sourceWeb", "vi"), "insights.sourceWeb");
  });

  it("pump timer + Tap to stop + guideline keys exist in EN and VI", () => {
    assert.equal(t("home.tapToStop", "en"), "Tap to stop");
    assert.equal(t("home.tapToStop", "vi"), "Chạm để dừng");
    assert.equal(t("home.header.pump", "en"), "Pump");
    assert.ok(t("home.header.pump", "vi").length > 0);
    assert.match(t("home.header.pumpEmpty", "en"), /amount/i);
    assert.ok(t("home.header.pumpEmpty", "vi").length > 0);
    assert.equal(t("home.pumpL", "en"), "Pump L");
    assert.ok(t("home.pumpL", "vi").length > 0);
    assert.notEqual(t("home.pumpL", "vi"), "home.pumpL");
    assert.equal(t("home.pumpR", "en"), "Pump R");
    assert.notEqual(t("home.pumpR", "vi"), "home.pumpR");
    assert.equal(t("home.pumpAmount", "en"), "Pump amount");
    assert.notEqual(t("home.pumpAmount", "vi"), "home.pumpAmount");
    assert.equal(t("feed.pumpL", "en"), "Pump L");
    assert.equal(t("feed.pumpR", "en"), "Pump R");
    assert.equal(t("feed.pump", "en"), "Pump");
    assert.match(t("feed.pumpMl", "en"), /\{ml\}/);
    assert.equal(t("home.stepCreatePumpAmount", "en"), "Saved pump amount");
    assert.notEqual(
      t("home.stepCreatePumpAmount", "vi"),
      "home.stepCreatePumpAmount",
    );

    const guideKeys = [
      "home.guide.feedTitle",
      "home.guide.sleepTitle",
      "home.guide.diaperTitle",
      "home.guide.pumpTitle",
      "home.guide.feed.1",
      "home.guide.feed.2",
      "home.guide.feed.3",
      "home.guide.sleep.1",
      "home.guide.sleep.2",
      "home.guide.sleep.3",
      "home.guide.diaper.1",
      "home.guide.diaper.2",
      "home.guide.diaper.3",
      "home.guide.pump.1",
      "home.guide.pump.2",
      "home.guide.pump.3",
      "home.guide.pump.4",
      "home.guide.pump.5",
      "home.guide.pump.6",
    ] as const;
    for (const key of guideKeys) {
      assert.ok(t(key, "en").length > 0, `missing en ${key}`);
      assert.ok(t(key, "vi").length > 0, `missing vi ${key}`);
      assert.notEqual(t(key, "vi"), key, `vi fallback for ${key}`);
      assert.ok(key in babyEn, `en table missing ${key}`);
      assert.ok(key in babyVi, `vi table missing ${key}`);
    }
    // Locked Pump table row 1 keeps day/week volume bands.
    assert.match(t("home.guide.pump.1", "en"), /1–15 mL|Days 1–3/i);
    assert.match(t("home.guide.pump.1", "vi"), /1–15 mL|Ngày 1–3/i);
  });
});
