import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  filterSettingsCategories,
  parseSettingsCategoryFromHash,
  resolveVisibleSettingsCategories,
  SETTINGS_CATEGORIES,
  MONEY_SETTINGS_CATEGORIES,
  INVESTMENT_SETTINGS_CATEGORIES,
  LOANS_SETTINGS_CATEGORIES,
  BABY_SETTINGS_CATEGORIES,
} from "./settings-types";

describe("Settings search and category filtering", () => {
  it("returns all categories when query is empty", () => {
    const { matchingCategories, matchCounts } = filterSettingsCategories("", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, SETTINGS_CATEGORIES.length);
    assert.deepEqual(matchCounts, {});
  });

  it("filters by category label (e.g. Appearance)", () => {
    const { matchingCategories } = filterSettingsCategories("appearance", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "appearance");
  });

  it("filters by category keywords (e.g. dark mode -> appearance)", () => {
    const { matchingCategories } = filterSettingsCategories("dark", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "appearance");
  });

  it("maps date format keywords to appearance (merged section)", () => {
    const { matchingCategories } = filterSettingsCategories("ymd", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "appearance");
  });

  it("does not expose a separate date-format category", () => {
    assert.equal(
      SETTINGS_CATEGORIES.some((c) => c.id === "date-format"),
      false,
    );
  });

  it("filters by description words (e.g. bearer -> api-tokens)", () => {
    const { matchingCategories } = filterSettingsCategories("bearer", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "api-tokens");
  });

  it("filters danger zone keywords (e.g. wipe / reset)", () => {
    const { matchingCategories } = filterSettingsCategories("wipe", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "danger-zone");
  });

  it("filters by category keywords (e.g. weather -> kiosk)", () => {
    const { matchingCategories } = filterSettingsCategories("weather", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "kiosk");
  });

  it("returns empty matches when query matches nothing", () => {
    const { matchingCategories, matchCounts } = filterSettingsCategories(
      "nonexistent_random_term_xyz",
      SETTINGS_CATEGORIES,
    );
    assert.equal(matchingCategories.length, 0);
    assert.equal(matchCounts.appearance, 0);
  });

  it("filters Money settings categories by keywords (e.g. budgets, recurrence, bills)", () => {
    const resBudgets = filterSettingsCategories("budgets", MONEY_SETTINGS_CATEGORIES);
    assert.equal(resBudgets.matchingCategories.length, 2); // ledger & clone mention budgets

    const resRecurrence = filterSettingsCategories("recurrence", MONEY_SETTINGS_CATEGORIES);
    assert.equal(resRecurrence.matchingCategories.length, 2); // ledger & clone mention recurrence

    const resBills = filterSettingsCategories("bills", MONEY_SETTINGS_CATEGORIES);
    assert.equal(resBills.matchingCategories.length, 1);
    assert.equal(resBills.matchingCategories[0].id, "menu");
  });

  it("filters Investment settings categories by keywords (e.g. forex, quotes, currency)", () => {
    const resForex = filterSettingsCategories("forex", INVESTMENT_SETTINGS_CATEGORIES);
    assert.equal(resForex.matchingCategories.length, 1);
    assert.equal(resForex.matchingCategories[0].id, "instruments");

    const resYahoo = filterSettingsCategories("yahoo", INVESTMENT_SETTINGS_CATEGORIES);
    assert.equal(resYahoo.matchingCategories.length, 1);
    assert.equal(resYahoo.matchingCategories[0].id, "instruments");

    const resCurrency = filterSettingsCategories("currency", INVESTMENT_SETTINGS_CATEGORIES);
    assert.equal(resCurrency.matchingCategories.length, 1);
    assert.equal(resCurrency.matchingCategories[0].id, "ledger");
  });

  it("filters Loans settings categories by keywords (e.g. reminders, push, due)", () => {
    const resPush = filterSettingsCategories("push", LOANS_SETTINGS_CATEGORIES);
    assert.equal(resPush.matchingCategories.length, 1);
    assert.equal(resPush.matchingCategories[0].id, "notifications");

    const resInstallments = filterSettingsCategories("installment", LOANS_SETTINGS_CATEGORIES);
    assert.equal(resInstallments.matchingCategories.length, 1);
    assert.equal(resInstallments.matchingCategories[0].id, "notifications");
  });

  it("filters Baby settings categories by keywords (e.g. birthday, telegram)", () => {
    const resBirth = filterSettingsCategories("birthday", BABY_SETTINGS_CATEGORIES);
    assert.equal(resBirth.matchingCategories.length, 1);
    assert.equal(resBirth.matchingCategories[0].id, "profile");

    const resTelegram = filterSettingsCategories("telegram", BABY_SETTINGS_CATEGORIES);
    assert.equal(resTelegram.matchingCategories.length, 1);
    assert.equal(resTelegram.matchingCategories[0].id, "telegram");
  });
});

describe("resolveVisibleSettingsCategories", () => {
  const fallback = SETTINGS_CATEGORIES[0].id;

  it("browse: empty search + active appearance → only appearance", () => {
    const { matchingCategories } = filterSettingsCategories("", SETTINGS_CATEGORIES);
    const visible = resolveVisibleSettingsCategories({
      isSearching: false,
      matchingCategories,
      activeCategory: "appearance",
      categories: SETTINGS_CATEGORIES,
      fallbackCategoryId: fallback,
    });
    assert.equal(visible.length, 1);
    assert.equal(visible[0].id, "appearance");
  });

  it("search: query token → api-tokens in visible list", () => {
    const { matchingCategories } = filterSettingsCategories("token", SETTINGS_CATEGORIES);
    const visible = resolveVisibleSettingsCategories({
      isSearching: true,
      matchingCategories,
      activeCategory: "all",
      categories: SETTINGS_CATEGORIES,
      fallbackCategoryId: fallback,
    });
    assert.ok(visible.some((c) => c.id === "api-tokens"));
    assert.equal(visible.length, matchingCategories.length);
  });

  it("browse: active all falls back to concrete fallback (not all sections)", () => {
    const { matchingCategories } = filterSettingsCategories("", SETTINGS_CATEGORIES);
    const visible = resolveVisibleSettingsCategories({
      isSearching: false,
      matchingCategories,
      activeCategory: "all",
      categories: SETTINGS_CATEGORIES,
      fallbackCategoryId: "workspaces",
    });
    assert.equal(visible.length, 1);
    assert.equal(visible[0].id, "workspaces");
  });

  it("after search then clear restore: previous concrete category only", () => {
    const searching = filterSettingsCategories("workspace", SETTINGS_CATEGORIES);
    const duringSearch = resolveVisibleSettingsCategories({
      isSearching: true,
      matchingCategories: searching.matchingCategories,
      activeCategory: "all",
      categories: SETTINGS_CATEGORIES,
      fallbackCategoryId: "workspaces",
    });
    assert.ok(duringSearch.length >= 1);

    const cleared = filterSettingsCategories("", SETTINGS_CATEGORIES);
    const afterClear = resolveVisibleSettingsCategories({
      isSearching: false,
      matchingCategories: cleared.matchingCategories,
      activeCategory: "workspaces",
      categories: SETTINGS_CATEGORIES,
      fallbackCategoryId: "appearance",
    });
    assert.equal(afterClear.length, 1);
    assert.equal(afterClear[0].id, "workspaces");
  });
});

describe("parseSettingsCategoryFromHash", () => {
  it("resolves #settings-api-tokens to api-tokens", () => {
    assert.equal(
      parseSettingsCategoryFromHash("#settings-api-tokens", "settings", SETTINGS_CATEGORIES),
      "api-tokens",
    );
  });

  it("resolves bare #appearance", () => {
    assert.equal(
      parseSettingsCategoryFromHash("#appearance", "settings", SETTINGS_CATEGORIES),
      "appearance",
    );
  });

  it("maps legacy #settings-date-format to appearance", () => {
    assert.equal(
      parseSettingsCategoryFromHash("#settings-date-format", "settings", SETTINGS_CATEGORIES),
      "appearance",
    );
  });
});

describe("SettingsPageLayout source", () => {
  const layoutSrc = readFileSync(
    join(process.cwd(), "components/settings/settings-page-layout.tsx"),
    "utf8",
  );

  it("uses resolveVisibleSettingsCategories for the main pane", () => {
    assert.match(layoutSrc, /resolveVisibleSettingsCategories/);
  });

  it("does not always map matchingCategories when browsing", () => {
    assert.match(layoutSrc, /visibleCategories\.map/);
  });
});

describe("BabySettingsPage source", () => {
  const src = readFileSync(
    join(process.cwd(), "components/baby-settings-page.tsx"),
    "utf8",
  );

  it("uses SettingsPageLayout like other settings pages", () => {
    assert.match(src, /SettingsPageLayout/);
    assert.match(src, /BABY_SETTINGS_CATEGORIES|BabySettingsCategoryId/);
  });
});

describe("BabySettingsSkeleton source", () => {
  const src = readFileSync(
    join(process.cwd(), "components/baby-page-skeleton.tsx"),
    "utf8",
  );

  it("uses sidebar + single content pane chrome", () => {
    assert.match(src, /md:w-52/);
    assert.match(src, /Loading baby settings/);
  });
});

describe("App Settings loading skeleton", () => {
  const loadingSrc = readFileSync(
    join(process.cwd(), "app/(shell)/settings/loading.tsx"),
    "utf8",
  );

  it("shows one content section skeleton (not stacked Account+Workspaces+API)", () => {
    const sectionMarkers = [
      "Appearance",
      "Date format",
      "Account",
      "Workspaces",
      "API Tokens",
      "Danger Zone",
    ];
    const present = sectionMarkers.filter((label) => loadingSrc.includes(label));
    assert.equal(
      present.length,
      1,
      `expected one section label in loading skeleton, found: ${present.join(", ")}`,
    );
    assert.equal(present[0], "Appearance");
  });
});
