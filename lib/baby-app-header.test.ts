import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyHomeTitleFromStatusBirthDate,
  resolveBabyAppHeader,
} from "@/lib/baby-app-header";
import { babyAgeInDays, babyAgeInMonthsFloor } from "@/lib/baby-age-guide";
import { t } from "@/lib/baby-i18n";

describe("resolveBabyAppHeader", () => {
  it("maps home and nested routes to i18n title keys", () => {
    assert.equal(resolveBabyAppHeader("/baby").titleKey, "home.title");
    assert.equal(resolveBabyAppHeader("/baby/feed").titleKey, "feed.title");
    assert.equal(resolveBabyAppHeader("/baby/pump").titleKey, "pump.title");
    assert.equal(resolveBabyAppHeader("/baby/sleep").titleKey, "sleep.title");
    assert.equal(resolveBabyAppHeader("/baby/diaper").titleKey, "diaper.title");
    assert.equal(
      resolveBabyAppHeader("/baby/insights").titleKey,
      "insights.title",
    );
    assert.equal(
      resolveBabyAppHeader("/baby/activities").titleKey,
      "activities.title",
    );
    assert.equal(
      resolveBabyAppHeader("/baby/growth").titleKey,
      "growth.title",
    );
    assert.equal(
      resolveBabyAppHeader("/baby/vaccines").titleKey,
      "growth.title",
    );
    assert.notEqual(
      resolveBabyAppHeader("/baby/vaccines").titleKey,
      "vaccine.title",
    );
    assert.equal(
      resolveBabyAppHeader("/baby/settings").titleKey,
      "settings.title",
    );
  });

  it("adds home crumb on nested routes only", () => {
    assert.deepEqual(resolveBabyAppHeader("/baby").breadcrumbs, []);
    assert.deepEqual(resolveBabyAppHeader("/baby/activities").breadcrumbs, []);
    assert.deepEqual(resolveBabyAppHeader("/baby/insights").breadcrumbs, [
      { labelKey: "home.title", href: "/baby" },
      { labelKey: "insights.title" },
    ]);
    assert.deepEqual(resolveBabyAppHeader("/baby/growth").breadcrumbs, [
      { labelKey: "home.title", href: "/baby" },
      { labelKey: "growth.title" },
    ]);
  });
});

describe("babyHomeTitleFromStatusBirthDate (Decision 7 Option 2 chrome)", () => {
  const now = new Date("2026-09-12T12:00:00.000Z");
  const title = t("home.title", "en");
  const titleWithAgeTemplate = t("home.titleWithAge", "en");
  const titleWithAgeDayTemplate = t("home.titleWithAgeDay", "en");
  const titleWithAgeDaysTemplate = t("home.titleWithAgeDays", "en");

  function titleFrom(statusBirthDate: string | null | undefined) {
    return babyHomeTitleFromStatusBirthDate({
      statusBirthDate,
      now,
      title,
      titleWithAgeTemplate,
      titleWithAgeDayTemplate,
      titleWithAgeDaysTemplate,
    });
  }

  it("under 1 month → days (singular / plural)", () => {
    assert.equal(titleFrom("2026-09-12"), "Baby Care · 0 days");
    assert.equal(titleFrom("2026-09-11"), "Baby Care · 1 day");
    assert.equal(titleFrom("2026-09-10"), "Baby Care · 2 days");
  });

  it("1+ months → titleWithAge with floor months from status", () => {
    const statusBirthDate = "2026-06-01";
    const ageDays = babyAgeInDays(statusBirthDate, now)!;
    const months = babyAgeInMonthsFloor(ageDays);
    const out = titleFrom(statusBirthDate);
    assert.equal(out, `Baby Care · ${months} months`);
    assert.notEqual(out, title);
    assert.equal(
      titleFrom("2026-01-01"),
      `Baby Care · ${babyAgeInMonthsFloor(babyAgeInDays("2026-01-01", now)!)} months`,
    );
  });

  it("null / missing status birthDate → plain home.title", () => {
    assert.equal(titleFrom(null), title);
    assert.equal(titleFrom(undefined), title);
  });
});
