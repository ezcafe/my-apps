import { expect, test, type Page, type Route } from "@playwright/test";
import {
  babyInsightsDateBoundsIso,
  babyInsightsDefaultRange,
} from "../lib/baby-insights-default-range";
import { BABY_INSIGHTS_LIST_VISIBLE_CAP } from "../lib/baby-insights-list-visible";
import { clickSoftNav, openAppMenu, appMenuPanel } from "./helpers/shell";
import {
  defaultStatus,
  gotoBabyHomeReady,
  installBabyHomeMocks,
  breastL,
  bottleHeader,
  bottleSave,
  diaperSave,
} from "./helpers/baby-home-graphql";

type InsightsQueryBounds = { from: string; to: string };

function parseGraphqlVariables(
  raw: string | null,
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    return (JSON.parse(raw) as { variables?: Record<string, unknown> })
      .variables;
  } catch {
    return undefined;
  }
}

function pushInsightsBounds(
  target: InsightsQueryBounds[],
  variables: Record<string, unknown> | undefined,
) {
  if (
    typeof variables?.from === "string" &&
    typeof variables?.to === "string"
  ) {
    target.push({ from: variables.from, to: variables.to });
  }
}

/** Local calendar day inclusive ISO bounds (same helper the dashboard uses). */
function insightsBoundsForLocalDate(ymd: string): InsightsQueryBounds {
  return babyInsightsDateBoundsIso(ymd, ymd);
}

/** Soft-empty series snapshot for Insights GraphQL mocks. */
function emptyBabyInsightsSeries() {
  return {
    hydration: { days: [], alert: null, emptyReason: "need_more_logs" },
    nightRest: { days: [], emptyReason: "need_more_sleep_logs" },
    wakeWindow: { avgMinutes: null, emptyReason: "need_3_days" },
    milkToDiaper: { avgLagMinutes: null, emptyReason: "need_more_logs" },
    sleepEfficiency: { emptyReason: "need_night_waking_logs" },
    patternFinder: { days: null, emptyReason: "need_more_logs" },
    awakeTrend: { days: null, emptyReason: "need_3_days" },
    diaperOutput: {
      buckets: null,
      alert: null,
      emptyReason: "need_more_texture_logs",
    },
    counts: { feeds: 0, sleep: 0, diapers: 0 },
    careCountDays: [],
  };
}

async function fulfillBabyInsightsGraphql(
  route: import("@playwright/test").Route,
  handlers: {
    timeline?: unknown;
    growth?: unknown;
    series?: unknown;
    vaccines?: unknown;
  } = {},
) {
  const body = route.request().postData() ?? "";
  if (/BabySyncConfig|babySyncConfig/.test(body)) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { babySyncConfig: { intervalMinutes: 60 } },
      }),
    });
    return;
  }
  if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          babyInsightsSeries: handlers.series ?? emptyBabyInsightsSeries(),
        },
      }),
    });
    return;
  }
  if (/BabyTimeline|babyTimeline|BabyInsightsTimeline/.test(body)) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: handlers.timeline ?? {
          babyTimeline: { items: [], nextCursor: null },
        },
      }),
    });
    return;
  }
  // Do not treat UpdateBabyGrowth / DeleteBabyGrowth mutations as list queries.
  if (
    (/BabyGrowth\b|babyGrowthEntries/.test(body) ||
      /query\s+BabyGrowth\b/.test(body)) &&
    !/updateBabyGrowth|UpdateBabyGrowth|deleteBabyGrowth|DeleteBabyGrowth/.test(
      body,
    )
  ) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: handlers.growth ?? {
          babyGrowthEntries: { items: [], nextCursor: null },
        },
      }),
    });
    return;
  }
  // Activities ledger also loads vaccines; mock empty so continue() never 401s.
  if (
    (/BabyVaccines\b|babyVaccines/.test(body) ||
      /query\s+BabyVaccines\b/.test(body)) &&
    !/createBabyVaccine|CreateBabyVaccine|updateBabyVaccine|UpdateBabyVaccine|deleteBabyVaccine|DeleteBabyVaccine/.test(
      body,
    )
  ) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: handlers.vaccines ?? {
          babyVaccines: { items: [], nextCursor: null },
        },
      }),
    });
    return;
  }
  await route.continue();
}

function expectedDefaultInsightsBounds(): InsightsQueryBounds {
  const { fromDate, toDate } = babyInsightsDefaultRange();
  return babyInsightsDateBoundsIso(fromDate, toDate);
}

function expectedYesterdayInsightsBounds(): InsightsQueryBounds {
  const now = new Date();
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const ymd = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  return insightsBoundsForLocalDate(ymd);
}

function boundsMatch(
  actual: InsightsQueryBounds,
  expected: InsightsQueryBounds,
): boolean {
  return actual.from === expected.from && actual.to === expected.to;
}

/** Open Activities ledger (dedicated page — no expand gate). */
async function openActivitiesLedger(page: Page) {
  await page.goto("/baby/activities");
  const ledger = page.getByTestId("baby-activities-ledger");
  await expect(ledger).toBeVisible({ timeout: 15_000 });
  return ledger;
}

/** Custom Checkbox uses sr-only input + visual span; force avoids span interception. */
async function checkActivityCheckbox(
  locator: import("@playwright/test").Locator,
) {
  await locator.check({ force: true });
}

/** Shared Baby GraphQL stubs used by Insights list e2e. */
async function fulfillBabySyncConfig(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      data: { babySyncConfig: { intervalMinutes: 60 } },
    }),
  });
}

function growthEntryFixture(
  id: string,
  valueNum: number,
  recordedAt = "2026-09-14T09:00:00.000Z",
) {
  return {
    id,
    kind: "weight",
    recordedAt,
    valueNum,
    valueText: null,
    unit: "kg",
    notes: null,
  };
}

/** Smoke: hamburger nav + Option B home + EN/VI in settings. Writes need E2E_STORAGE_STATE. */

const hasAuthStorage = Boolean(process.env.E2E_STORAGE_STATE?.trim());

async function gotoBabyHome(page: Page) {
  await page.goto("/baby");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** Open a full care form from the hamburger (not home quick cards). */
async function openCareFormFromMenu(
  page: Page,
  linkName: RegExp,
  url: RegExp,
) {
  await openAppMenu(page);
  const link = appMenuPanel(page).getByRole("link", { name: linkName });
  await clickSoftNav(page, link, url, 120_000);
}

/** Assert a status row left the empty chip (no wall-clock timestamp asserts). */
async function expectStatusRowNotEmpty(
  page: Page,
  label: RegExp,
  valueHint?: RegExp,
) {
  const status = page.getByTestId("baby-home-status");
  const row = status.locator("div").filter({ hasText: label }).first();
  await expect(row).toBeVisible();
  await expect(row.getByText(/not logged yet|chưa ghi/i)).toHaveCount(0);
  if (valueHint) {
    await expect(row.getByText(valueHint)).toBeVisible();
  }
}

test.describe("Baby Care smoke", () => {
  test("hamburger reaches Baby Care home", async ({ page }) => {
    // /help is auth-gated (proxy matcher); /baby* renders shell without session.
    await page.goto("/baby/settings");
    await expect(
      page.getByRole("heading", { level: 1, name: /settings|cài đặt/i }),
    ).toBeVisible();
    await openAppMenu(page);
    await page
      .getByRole("link", { name: /baby care|chăm bé/i })
      .click();
    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(
      page.getByRole("heading", { name: /baby care|chăm bé/i }),
    ).toBeVisible();
  });

  test("home shows last-care status below quick cards", async ({ page }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        lastFeed: {
          id: "f1",
          kind: "care",
          type: "feed",
          at: "2026-09-12T08:00:00.000Z",
          endedAt: null,
          payload: { method: "breast_l" },
          summary: "Feed (Breast L)",
          source: "web",
          cursor: "c1",
        },
        feedsToday: 2,
      }),
    });
    await gotoBabyHomeReady(page);
    const status = page.getByTestId("baby-home-status");
    await expect(status).toBeVisible();
    await expect(status.getByText(/last feed|lần bú/i).first()).toBeVisible();
    // Empty nap copy is "No nap logged yet" / "Chưa ghi giấc ngủ" (not "Last nap").
    await expect(
      status.getByText(/nap|giấc ngủ/i).first(),
    ).toBeVisible();
    await expect(
      status.getByText(/last diaper|đổi tã|no diaper|chưa ghi lần đổi tã/i).first(),
    ).toBeVisible();
    // Option B: no link CTAs on home — forms live in the hamburger.
    await expect(
      page.getByRole("main").getByRole("link", { name: /log feed|ghi bú/i }),
    ).toHaveCount(0);
    await expect(breastL(page)).toBeVisible();
  });

  test("home status error keeps breast bottle diaper saving", async ({
    page,
  }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: "error",
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          {
            step: "createDiaper",
            event: {
              id: "d1",
              type: "diaper",
              occurredAt: "2026-09-12T10:00:00.000Z",
              endedAt: null,
              payload: { kind: "wet" },
            },
          },
        ],
      },
    });

    await gotoBabyHomeReady(page);
    const status = page.getByTestId("baby-home-status");
    await expect(
      status
        .getByText(/could not load\. you can still log|không tải được\. bạn vẫn/i)
        .first(),
    ).toBeVisible();
    // Sleep is fail-closed with Retry; breast / bottle / diaper still work.
    await expect(
      page.getByText(/could not check nap|không kiểm tra được/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^retry$|^thử lại$/i })).toBeVisible();
    await expect(breastL(page)).toBeVisible();
    await expect(bottleSave(page)).toBeVisible();
    await diaperSave(page).click();
    await expect(
      page.locator('[data-diaper-kind="wet"]'),
    ).toContainText(/Done|Xong/);
    expect(mocks.quickCareCount()).toBe(1);
    mocks.assertNoLegacyEventIdShape();
  });

  test("hamburger Log feed opens feed form", async ({ page }) => {
    await gotoBabyHome(page);
    await openCareFormFromMenu(page, /log feed|ghi bú/i, /\/baby\/feed/);
    await expect(
      page.getByRole("heading", { name: /log feed|ghi bú/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /breast l|ngực trái/i }),
    ).toBeVisible();
  });

  test("hamburger Log nap opens sleep form", async ({ page }) => {
    await gotoBabyHome(page);
    await openCareFormFromMenu(page, /log nap|ghi ngủ/i, /\/baby\/sleep/);
    await expect(
      page.getByRole("heading", { name: /sleep|giấc ngủ/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /start nap|bắt đầu ngủ/i }),
    ).toBeVisible();
  });

  test("hamburger Log diaper opens diaper form", async ({ page }) => {
    await gotoBabyHome(page);
    await openCareFormFromMenu(page, /log diaper|ghi tã/i, /\/baby\/diaper/);
    await expect(
      page.getByRole("heading", { name: /log diaper|ghi tã/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /wet|ướt/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /poop only|chỉ phân/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /mixed|hỗn hợp/i }),
    ).toBeVisible();
  });

  test("hamburger Activities opens /baby/activities", async ({ page }) => {
    await gotoBabyHome(page);
    await openAppMenu(page);
    // Scope to the open menu panel so we do not hit a stale/home control.
    const activitiesLink = page
      .getByRole("dialog")
      .getByRole("navigation", { name: /Baby Care sections|mục Chăm bé/i })
      .getByRole("link", { name: /^activities$|^hoạt động$/i });
    await expect(activitiesLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/baby\/activities/),
      activitiesLink.click(),
    ]);
    await expect(
      page.getByRole("heading", { name: /activities|hoạt động/i }),
    ).toBeVisible();
  });

  test("insights page shows filters and growth then timeline", async ({
    page,
  }) => {
    await gotoBabyHome(page);
    await openAppMenu(page);
    // Scope to the open menu panel so we do not hit a stale/home control.
    const insightsLink = page
      .getByRole("dialog")
      .getByRole("navigation", { name: /Baby Care sections|mục Chăm bé/i })
      .getByRole("link", { name: /^insights$|^thống kê$/i });
    await expect(insightsLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/baby\/insights/),
      insightsLink.click(),
    ]);
    await expect(
      page.getByRole("heading", { name: /insights|thống kê/i }),
    ).toBeVisible();

    // Filters: date toolbar + Apply/Reset + period chip (view-only page).
    const filters = page.getByRole("region", { name: /insights filters/i });
    await expect(filters).toBeVisible();
    const applyDesktop = filters.getByRole("button", { name: /^apply$/i });
    if (await applyDesktop.isVisible()) {
      await expect(applyDesktop).toBeVisible();
      await expect(
        filters.getByRole("button", { name: /^reset$/i }),
      ).toBeVisible();
      await filters.locator("button[aria-expanded]").first().click();
    } else {
      await filters.getByRole("button", { name: /^filter/i }).click();
      await expect(
        page.getByRole("button", { name: /apply filters/i }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^reset$/i })).toBeVisible();
    }
    await expect(
      page.getByRole("radiogroup", { name: /^from date$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: /^to date$/i }),
    ).toBeVisible();
    await expect(page.getByText(/^showing\b/i)).toBeVisible();

    await expect(page.getByTestId("baby-hydration-chart")).toBeVisible();
    await expect(page.getByTestId("baby-night-rest-chart")).toBeVisible();
    await expect(page.getByTestId("baby-more-insights")).toBeVisible();
    await expect(page.getByTestId("baby-activity-log")).toHaveCount(0);
    await expect(page.getByTestId("baby-insights-activities-cue")).toBeVisible();
    await expect(
      page.getByTestId("baby-insights-activities-cue").getByRole("link", {
        name: /open activities|mở hoạt động/i,
      }),
    ).toHaveAttribute("href", "/baby/activities");
    // KPI strips and legacy charts stay behind More insights.
    await expect(page.getByTestId("baby-count-kpis")).toHaveCount(0);
    await expect(page.getByTestId("baby-insights-charts")).toHaveCount(0);

    // View-only: no Growth editors on Insights (writes live on /baby/growth).
    await expect(
      page.getByRole("button", { name: /add entry|thêm mục/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^edit$|^sửa$/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^delete$|^xóa$/i }),
    ).toHaveCount(0);
  });

  test("activities shared chips apply to ledger", async ({ page }) => {
    // Mock GraphQL so chip Apply effects are deterministic without a write session.
    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babySyncConfig: { intervalMinutes: 60 } },
          }),
        });
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyTimeline: {
                items: [
                  {
                    id: "e2e-feed-1",
                    kind: "care",
                    type: "feed",
                    at: "2026-09-05T10:00:00.000Z",
                    endedAt: null,
                    summary: "E2E feed event",
                    source: "web",
                    cursor: "c1",
                  },
                  {
                    id: "e2e-sleep-1",
                    kind: "care",
                    type: "sleep",
                    at: "2026-09-05T12:00:00.000Z",
                    endedAt: null,
                    summary: "E2E sleep event",
                    source: "web",
                    cursor: "c2",
                  },
                ],
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyGrowthEntries: {
                items: [
                  {
                    id: "e2e-weight-1",
                    kind: "weight",
                    recordedAt: "2026-09-05T09:00:00.000Z",
                    valueNum: 4.2,
                    valueText: null,
                    unit: "kg",
                    notes: null,
                  },
                  {
                    id: "e2e-height-1",
                    kind: "height",
                    recordedAt: "2026-09-05T09:30:00.000Z",
                    valueNum: 55,
                    valueText: null,
                    unit: "cm",
                    notes: null,
                  },
                ],
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      await route.continue();
    });

    const panel = await openActivitiesLedger(page);
    await expect(
      page.getByRole("heading", { name: /activities|hoạt động/i }),
    ).toBeVisible();

    // Unfiltered: care + growth rows in one table (+ mobile cards).
    const table = panel.getByRole("table");
    await expect(table).toHaveCount(1);
    await expect(table.getByText("E2E feed event")).toBeVisible();
    await expect(table.getByText("E2E sleep event")).toBeVisible();
    await expect(table.getByText(/Weight:\s*4\.2 kg/i)).toBeVisible();
    await expect(table.getByText(/Height:\s*55 cm/i)).toBeVisible();

    const cards = panel.locator("ul > li");
    await expect(cards).toHaveCount(4);
    await expect(cards.getByText(/Weight:\s*4\.2 kg/i)).toHaveCount(1);
    await expect(cards.getByText(/Height:\s*55 cm/i)).toHaveCount(1);
    await expect(cards.getByText("E2E feed event")).toHaveCount(1);
    await expect(cards.getByText("E2E sleep event")).toHaveCount(1);

    // Care types (care + measures) live in one filter-bar multi-select.
    // Toolbar uses @container @md — wait for either desktop Care types or mobile Filter.
    const careOrFilter = page.getByRole("button", {
      name: /^(care types|loại chăm sóc|filter)\b/i,
    });
    await expect(careOrFilter.first()).toBeVisible({ timeout: 15_000 });
    const chromeLabel = (await careOrFilter.first().innerText()).toLowerCase();

    if (chromeLabel.startsWith("filter")) {
      await careOrFilter.first().click();
      await page.getByRole("button", { name: /^feed$|^bú$/i }).click();
      await page.getByRole("button", { name: /^weight$|^cân nặng$/i }).click();
      await page
        .getByRole("button", { name: /apply filters|áp dụng bộ lọc/i })
        .click();
    } else {
      await careOrFilter.first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: /^feed$|^bú$/i }).click();
      await dialog.getByRole("button", { name: /^weight$|^cân nặng$/i }).click();
      await page
        .getByLabel("Insights filters")
        .getByRole("button", { name: /^apply$|^áp dụng$/i })
        .click();
    }

    // Period chip reflects applied care + growth filters.
    const period = page.getByText(/^showing\b|^đang xem\b/i);
    await expect(period).toContainText(/Feed|Bú/i);
    await expect(period).toContainText(/Weight|Cân/i);

    // Activity log follows the merged Care types filter (single list).
    await expect(table.getByText("E2E feed event")).toBeVisible();
    await expect(table.getByText("E2E sleep event")).toHaveCount(0);
    await expect(table.getByText(/Weight:\s*4\.2 kg/i)).toBeVisible();
    await expect(table.getByText(/Height:\s*55 cm/i)).toHaveCount(0);

    // Re-open Care types: Diaper alone must drop growth rows (merged exclusivity).
    if (chromeLabel.startsWith("filter")) {
      await careOrFilter.first().click();
      await page.getByRole("button", { name: /^feed$|^bú$/i }).click();
      await page.getByRole("button", { name: /^weight$|^cân nặng$/i }).click();
      await page.getByRole("button", { name: /^diaper$|^tã$/i }).click();
      await page
        .getByRole("button", { name: /apply filters|áp dụng bộ lọc/i })
        .click();
    } else {
      await careOrFilter.first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: /^feed$|^bú$/i }).click();
      await dialog.getByRole("button", { name: /^weight$|^cân nặng$/i }).click();
      await dialog.getByRole("button", { name: /^diaper$|^tã$/i }).click();
      await page
        .getByLabel("Insights filters")
        .getByRole("button", { name: /^apply$|^áp dụng$/i })
        .click();
    }

    await expect(table.getByText("E2E feed event")).toHaveCount(0);
    await expect(table.getByText("E2E sleep event")).toHaveCount(0);
    await expect(table.getByText(/Weight:\s*4\.2 kg/i)).toHaveCount(0);
    await expect(table.getByText(/Height:\s*55 cm/i)).toHaveCount(0);
    // Diaper row may use summary or chip title — sleep/feed gone is the contract.
  });

  test("activities defaults to last 7 days, empty is non-error, Reset restores default", async ({
    page,
  }) => {
    const timelineBounds: InsightsQueryBounds[] = [];
    const growthBounds: InsightsQueryBounds[] = [];
    const defaultBounds = expectedDefaultInsightsBounds();

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      const variables = parseGraphqlVariables(body);
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babySyncConfig: { intervalMinutes: 60 } },
          }),
        });
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        pushInsightsBounds(timelineBounds, variables);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyTimeline: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        pushInsightsBounds(growthBounds, variables);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyGrowthEntries: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
            if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      if (/BabyVaccines\b|babyVaccines/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyVaccines: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/baby/activities");
    await expect(
      page.getByRole("heading", { name: /activities|hoạt động/i }),
    ).toBeVisible();

    const filters = page.getByRole("region", { name: /insights filters/i });
    await expect(filters).toBeVisible();
    const applyDesktop = filters.getByRole("button", { name: /^apply$/i });
    if (await applyDesktop.isVisible()) {
      await filters.locator("button[aria-expanded]").first().click();
    } else {
      await filters.getByRole("button", { name: /^filter/i }).click();
    }

    const fromDate = page.getByRole("radiogroup", { name: /^from date$/i });
    const toDate = page.getByRole("radiogroup", { name: /^to date$/i });
    // Last 7 days: from is a custom date chip (not Today/Yesterday), to is today.
    await expect(fromDate.getByRole("radio", { name: /^today$/i })).not.toBeChecked();
    await expect(
      fromDate.getByRole("radio", { name: /^yesterday$/i }),
    ).not.toBeChecked();
    await expect(toDate.getByRole("radio", { name: /^today$/i })).toBeChecked();

    const period = page.getByText(/^showing\b|^đang xem\b/i);
    await expect(period).toBeVisible();
    await expect(period).not.toContainText(/this month|tháng này/i);
    // Multi-day default: from and to display text differ.
    const periodRange = period.locator("span").first();
    const initialPeriodRangeText = (await periodRange.innerText()).trim();
    const periodParts = initialPeriodRangeText.split(/\s+[–—-]\s+/);
    expect(periodParts).toHaveLength(2);
    expect(periodParts[0]?.trim()).toBeTruthy();
    expect(periodParts[1]?.trim()).toBeTruthy();
    expect(periodParts[0]?.trim()).not.toBe(periodParts[1]?.trim());

    // Lists load on Activities mount (no expand gate).
    const activityPanel = page.getByTestId("baby-activities-ledger");
    await expect(activityPanel).toBeVisible();

    // GraphQL list loads use default last-7-days inclusive bounds.
    await expect
      .poll(() => timelineBounds.some((b) => boundsMatch(b, defaultBounds)))
      .toBe(true);
    await expect
      .poll(() => growthBounds.some((b) => boundsMatch(b, defaultBounds)))
      .toBe(true);

    // Empty range: muted Activities empty copy, not section error.
    const activityEmpty = activityPanel.getByText(
      /no care or measurements in this range|không có chăm sóc hoặc cân đo/i,
    );
    await expect(activityEmpty).toBeVisible();
    await expect(activityEmpty).toHaveClass(/text-muted/);
    await expect(
      activityPanel.getByText(
        /could not load activities|không tải được hoạt động|could not load growth|không tải được cân đo/i,
      ),
    ).toHaveCount(0);
    await expect(activityPanel.getByRole("table")).toHaveCount(0);

    // Re-open only if the date panel closed (outside click). A second
    // trigger click toggles it shut and hides Yesterday radios.
    // Prefer aria-expanded triggers over Apply label — Apply briefly becomes
    // "Loading…" during transition and would falsely look like mobile chrome.
    async function ensureDateFiltersOpen() {
      if (await fromDate.isVisible()) return;
      const dateTrigger = filters.locator("button[aria-expanded]").first();
      if (await dateTrigger.isVisible()) {
        await dateTrigger.click();
      } else {
        await filters.getByRole("button", { name: /^filter/i }).click();
      }
      await expect(fromDate).toBeVisible();
    }
    await ensureDateFiltersOpen();

    const desktopChrome = await filters
      .locator("button[aria-expanded]")
      .first()
      .isVisible();
    await fromDate.getByRole("radio", { name: /^yesterday$/i }).click();
    await toDate.getByRole("radio", { name: /^yesterday$/i }).click();
    if (desktopChrome) {
      await applyDesktop.click();
      // Apply closes the date menu — reopen to read radiogroups.
      await ensureDateFiltersOpen();
    } else {
      await page
        .getByRole("button", { name: /apply filters|áp dụng bộ lọc/i })
        .click();
      await ensureDateFiltersOpen();
    }

    await expect(
      fromDate.getByRole("radio", { name: /^yesterday$/i }),
    ).toBeChecked();

    // Apply wiring: GraphQL must use yesterday inclusive bounds (not still default).
    const yesterdayBounds = expectedYesterdayInsightsBounds();
    await expect
      .poll(() => timelineBounds.some((b) => boundsMatch(b, yesterdayBounds)))
      .toBe(true);
    await expect
      .poll(() => growthBounds.some((b) => boundsMatch(b, yesterdayBounds)))
      .toBe(true);

    const timelineCountBeforeReset = timelineBounds.length;
    const growthCountBeforeReset = growthBounds.length;

    if (desktopChrome) {
      // Reset label stays stable; Apply may still say Loading… after prior Apply.
      await filters.getByRole("button", { name: /^reset$|^đặt lại$/i }).click();
    } else {
      await page.getByRole("button", { name: /^reset$|^đặt lại$/i }).click();
    }
    await ensureDateFiltersOpen();

    await expect(fromDate.getByRole("radio", { name: /^today$/i })).not.toBeChecked();
    await expect(
      fromDate.getByRole("radio", { name: /^yesterday$/i }),
    ).not.toBeChecked();
    await expect(toDate.getByRole("radio", { name: /^today$/i })).toBeChecked();
    await expect(period).not.toContainText(/this month|tháng này/i);
    // Positive default restore: period chip matches the initial last-7-days label
    // (yesterday is same-day, so equal from/to alone is not enough after Reset).
    await expect(periodRange).toHaveText(initialPeriodRangeText);

    // Reset → default last 7 days: any new GraphQL must use default bounds.
    // Fresh cache (staleTime 30s) may skip refetch; initial default + Apply yesterday already
    // proved dashboard→query wiring, so zero new requests after Reset is allowed.
    await expect
      .poll(() => {
        const newer = [
          ...timelineBounds.slice(timelineCountBeforeReset),
          ...growthBounds.slice(growthCountBeforeReset),
        ];
        if (newer.some((b) => !boundsMatch(b, defaultBounds))) return false;
        if (newer.length === 0) return true; // cache hit
        const newerTimeline = timelineBounds.slice(timelineCountBeforeReset);
        const newerGrowth = growthBounds.slice(growthCountBeforeReset);
        return (
          newerTimeline.some((b) => boundsMatch(b, defaultBounds)) &&
          newerGrowth.some((b) => boundsMatch(b, defaultBounds))
        );
      })
      .toBe(true);
    await expect(
      page.getByText(/could not load growth|không tải được cân đo/i),
    ).toHaveCount(0);
  });

  test("insights Apply date range refetches series and updates hydration chart", async ({
    page,
  }) => {
    const seriesBounds: InsightsQueryBounds[] = [];
    const defaultBounds = expectedDefaultInsightsBounds();
    const yesterdayBounds = expectedYesterdayInsightsBounds();
    const now = new Date();
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayYmd = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      const variables = parseGraphqlVariables(body);
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await fulfillBabySyncConfig(route);
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        pushInsightsBounds(seriesBounds, variables);
        const forYesterday =
          typeof variables?.from === "string" &&
          typeof variables?.to === "string" &&
          boundsMatch(
            { from: variables.from, to: variables.to },
            yesterdayBounds,
          );
        const series = forYesterday
          ? {
              ...emptyBabyInsightsSeries(),
              hydration: {
                days: [],
                alert: null,
                emptyReason: "need_more_logs",
              },
            }
          : {
              ...emptyBabyInsightsSeries(),
              hydration: {
                days: [
                  {
                    date: yesterdayYmd,
                    wetCount: 8,
                    feedCount: 5,
                    formulaMl: null,
                  },
                ],
                alert: null,
                emptyReason: null,
              },
              nightRest: {
                days: [
                  {
                    date: yesterdayYmd,
                    nightSleepMinutes: 420,
                    intervalCount: 1,
                  },
                ],
                emptyReason: null,
              },
            };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { babyInsightsSeries: series } }),
        });
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyTimeline: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyGrowthEntries: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/baby/insights");
    const hydration = page.getByTestId("baby-hydration-chart");
    await expect(hydration).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(() => seriesBounds.some((b) => boundsMatch(b, defaultBounds)))
      .toBe(true);
    // Default range has hydration days — not the soft-empty copy.
    await expect(
      hydration.getByText(
        /need more feed or diaper logs|cần thêm nhật ký bú hoặc tã/i,
      ),
    ).toHaveCount(0);
    // Filter chrome stays mounted (not swapped for full-page skeleton on later loads).
    const filters = page.getByRole("region", { name: /insights filters/i });
    await expect(filters).toBeVisible();

    const applyDesktop = filters.getByRole("button", { name: /^apply$/i });
    if (await applyDesktop.isVisible()) {
      await filters.locator("button[aria-expanded]").first().click();
    } else {
      await filters.getByRole("button", { name: /^filter/i }).click();
    }

    const fromDate = page.getByRole("radiogroup", { name: /^from date$/i });
    const toDate = page.getByRole("radiogroup", { name: /^to date$/i });
    await fromDate.getByRole("radio", { name: /^yesterday$/i }).click();
    await toDate.getByRole("radio", { name: /^yesterday$/i }).click();

    if (await applyDesktop.isVisible()) {
      await applyDesktop.click();
    } else {
      await page
        .getByRole("button", { name: /apply filters|áp dụng bộ lọc/i })
        .click();
    }

    // Filters must remain visible while the new series loads (no full-page swap).
    await expect(filters).toBeVisible();
    await expect(
      page.getByRole("status", { name: /loading insights/i }),
    ).toHaveCount(0);

    await expect
      .poll(() => seriesBounds.some((b) => boundsMatch(b, yesterdayBounds)))
      .toBe(true);
    await expect(
      hydration.getByText(
        /need more feed or diaper logs|cần thêm nhật ký bú hoặc tã/i,
      ),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("activities ledger uses table chrome", async ({ page }) => {
    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babySyncConfig: { intervalMinutes: 60 } },
          }),
        });
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyTimeline: {
                items: [
                  {
                    id: "e2e-table-feed",
                    kind: "care",
                    type: "feed",
                    at: "2026-09-14T10:00:00.000Z",
                    endedAt: null,
                    summary: "E2E table feed",
                    source: "web",
                    cursor: "c1",
                  },
                ],
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyGrowthEntries: {
                items: [
                  {
                    id: "e2e-table-weight",
                    kind: "weight",
                    valueNum: 4.2,
                    unit: "kg",
                    recordedAt: "2026-09-14T09:00:00.000Z",
                    valueText: null,
                    notes: null,
                    cursor: "g1",
                  },
                ],
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      await route.continue();
    });

    const panel = await openActivitiesLedger(page);

    // One merged table (Event / Recorded) + mobile card rows.
    const table = panel.getByRole("table");
    await expect(table).toHaveCount(1);
    await expect(
      table.getByRole("columnheader", { name: /^event$|^sự kiện$/i }),
    ).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: /^recorded$|^ghi nhận$/i }),
    ).toBeVisible();
    await expect(table.getByText(/Weight:\s*4\.2 kg/i)).toBeVisible();
    await expect(table.getByText("E2E table feed")).toBeVisible();

    // Mobile card chrome uses @container @md:hidden — narrow viewport so cards show.
    await page.setViewportSize({ width: 390, height: 844 });
    const cards = panel.locator("ul > li");
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText(/E2E table feed|Weight:\s*4\.2 kg/i);
    // Card chrome: bordered surface row with checkbox + Edit (not one big button).
    await expect(cards.first().locator("div").first()).toHaveClass(/border/);
    await expect(
      cards.first().getByRole("button", { name: /^edit$|^sửa$/i }),
    ).toBeVisible();
    await expect(
      cards.first().getByRole("checkbox"),
    ).toBeVisible();
  });

  test("activities show more and load more still work", async ({
    page,
  }) => {
    // DOM cap is 100; one extra row unlocks Show more. nextCursor unlocks Load more.
    const pageOneCount = BABY_INSIGHTS_LIST_VISIBLE_CAP + 1;
    const pageOneItems = Array.from({ length: pageOneCount }, (_, i) =>
      growthEntryFixture(
        `e2e-show-${i}`,
        i === pageOneCount - 1 ? 9.91 : 4.2,
        // Oldest timestamp → last after newest-first merge → beyond DOM cap.
        i === pageOneCount - 1
          ? "2026-09-01T09:00:00.000Z"
          : "2026-09-14T09:00:00.000Z",
      ),
    );
    const pageTwoItem = growthEntryFixture(
      "e2e-load-more",
      8.88,
      "2026-09-15T09:00:00.000Z",
    );
    let loadMoreCalls = 0;

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await fulfillBabySyncConfig(route);
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyTimeline: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        const variables = parseGraphqlVariables(body);
        const cursor =
          typeof variables?.cursor === "string" ? variables.cursor : null;
        if (cursor === "g2") {
          loadMoreCalls += 1;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                babyGrowthEntries: {
                  items: [pageTwoItem],
                  nextCursor: null,
                },
              },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyGrowthEntries: {
                items: pageOneItems,
                nextCursor: "g2",
              },
            },
          }),
        });
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      await route.continue();
    });

    const panel = await openActivitiesLedger(page);

    const activityTable = panel.getByRole("table");
    const activityCards = panel.locator("ul > li");
    // Header + capped data rows; extra DOM row stays hidden until Show more.
    await expect(activityTable.getByRole("row")).toHaveCount(
      BABY_INSIGHTS_LIST_VISIBLE_CAP + 1,
    );
    await expect(activityCards).toHaveCount(BABY_INSIGHTS_LIST_VISIBLE_CAP);
    await expect(activityTable.getByText(/9\.91 kg/i)).toHaveCount(0);

    const showMore = panel.getByRole("button", {
      name: /show more rows|hiện thêm dòng/i,
    });
    const loadMore = panel.getByRole("button", {
      name: /load more|tải thêm/i,
    });
    await expect(showMore).toBeVisible();
    await expect(loadMore).toBeVisible();

    await showMore.click();
    await expect(activityTable.getByRole("row")).toHaveCount(pageOneCount + 1);
    await expect(activityCards).toHaveCount(pageOneCount);
    await expect(activityTable.getByText(/9\.91 kg/i)).toBeVisible();

    await loadMore.click();
    await expect.poll(() => loadMoreCalls).toBeGreaterThan(0);
    await expect(activityTable.getByText(/8\.88 kg/i)).toBeVisible();
    await expect(activityTable.getByRole("row")).toHaveCount(pageOneCount + 2);
  });

  test("insights loading skeleton has cue + More insights (no Activity log)", async ({
    page,
  }) => {
    // Hold series (+ lists) so the client loading skeleton stays visible long enough.
    let releaseLists!: () => void;
    const listsGate = new Promise<void>((resolve) => {
      releaseLists = resolve;
    });

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await fulfillBabySyncConfig(route);
        return;
      }
      if (
        /BabyInsightsSeries|babyInsightsSeries|BabyTimeline|babyTimeline|BabyGrowth|babyGrowthEntries/.test(
          body,
        )
      ) {
        await listsGate;
        if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: { babyInsightsSeries: emptyBabyInsightsSeries() },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: /BabyTimeline|babyTimeline/.test(body)
              ? { babyTimeline: { items: [], nextCursor: null } }
              : { babyGrowthEntries: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      await route.continue();
    });

    const nav = page.goto("/baby/insights");
    const loading = page.getByRole("status", { name: /loading insights/i });
    await expect(loading).toBeVisible({ timeout: 15_000 });
    // No ledger tables; cue placeholder + one More insights toggle.
    await expect(loading.locator("table")).toHaveCount(0);
    await expect(
      loading.locator(
        'div.px-4.py-3[class*="border-border"][class*="bg-surface"]',
      ),
    ).toHaveCount(0);
    await expect(loading.locator("ul.divide-y")).toHaveCount(0);
    await expect(loading.locator(".h-12.w-40")).toHaveCount(1);

    releaseLists();
    await nav;
    await expect(
      page.getByRole("heading", { name: /insights|thống kê/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", { name: /loading insights/i }),
    ).toHaveCount(0);
  });

  test("activities page skeleton then empty ledger while loading", async ({
    page,
  }) => {
    let releaseLists!: () => void;
    const listsGate = new Promise<void>((resolve) => {
      releaseLists = resolve;
    });

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await fulfillBabySyncConfig(route);
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      if (
        /BabyTimeline|babyTimeline|BabyGrowth|babyGrowthEntries/.test(body)
      ) {
        await listsGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: /BabyTimeline|babyTimeline/.test(body)
              ? { babyTimeline: { items: [], nextCursor: null } }
              : { babyGrowthEntries: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      if (/BabyVaccines\b|babyVaccines/.test(body)) {
        await listsGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyVaccines: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      await route.continue();
    });

    const nav = page.goto("/baby/activities");
    const loading = page.getByRole("status", { name: /loading activities/i });
    await expect(loading).toBeVisible({ timeout: 15_000 });
    // Filters → period → ledger placeholders
    await expect(loading.locator('[data-skeleton="activities-filters"]')).toHaveCount(1);
    await expect(loading.locator('[data-skeleton="activities-period"]')).toHaveCount(1);
    await expect(loading.locator('[data-skeleton="activities-ledger"]')).toHaveCount(1);
    await expect(loading.locator("table")).toHaveCount(1);

    releaseLists();
    await nav;
    await expect(loading).toHaveCount(0);
    await expect(
      page.getByTestId("baby-activities-ledger").getByText(
        /no care or measurements|không có chăm sóc hoặc cân đo/i,
      ),
    ).toBeVisible();
  });

  test("activities load error shows alert and retry", async ({ page }) => {
    let failLists = true;
    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await fulfillBabySyncConfig(route);
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        if (failLists) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              errors: [{ message: "e2e forced timeline error" }],
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyTimeline: {
                items: [
                  {
                    id: "e2e-retry-feed",
                    kind: "care",
                    type: "feed",
                    at: "2026-09-14T10:00:00.000Z",
                    endedAt: null,
                    summary: "E2E retry bottle",
                    source: "web",
                    cursor: "c-retry",
                  },
                ],
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        if (failLists) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              errors: [{ message: "e2e forced growth error" }],
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyGrowthEntries: { items: [], nextCursor: null },
            },
          }),
        });
        return;
      }
      if (/BabyVaccines\b|babyVaccines/.test(body)) {
        if (failLists) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              errors: [{ message: "e2e forced vaccines error" }],
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyVaccines: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      await route.continue();
    });

    const panel = await openActivitiesLedger(page);

    const loadError = panel.getByRole("alert").filter({
      hasText: /could not load activities|không tải được hoạt động/i,
    });
    await expect(loadError).toBeVisible();
    await expect(loadError).toHaveCount(1);
    const retryBtn = loadError.getByRole("button", {
      name: /^retry$|^thử lại$/i,
    });
    await expect(retryBtn).toBeVisible();
    await expect(
      panel.getByText(
        /no care or measurements in this range|không có chăm sóc hoặc cân đo/i,
      ),
    ).toHaveCount(0);
    await expect(
      panel.getByText(/could not load growth|không tải được cân đo/i),
    ).toHaveCount(0);
    await expect(panel.getByRole("table")).toHaveCount(0);

    failLists = false;
    await retryBtn.click();
    await expect(loadError).toHaveCount(0);
    await expect(panel.getByRole("table")).toBeVisible();
    // Table + card chrome both render the summary — scope to the table cell.
    await expect(
      panel.getByRole("table").getByText(/E2E retry bottle/i),
    ).toBeVisible();
  });

  test("activities ledger stays usable in light and dark", async ({
    page,
  }) => {
    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await fulfillBabySyncConfig(route);
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyTimeline: {
                items: [
                  {
                    id: "e2e-theme-feed",
                    kind: "care",
                    type: "feed",
                    at: "2026-09-14T10:00:00.000Z",
                    endedAt: null,
                    summary: "E2E theme feed",
                    source: "web",
                    cursor: "c1",
                  },
                ],
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyGrowthEntries: {
                items: [growthEntryFixture("e2e-theme-weight", 4.2)],
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      await route.continue();
    });

    const html = page.locator("html");

    await page.goto("/baby/activities");
    await page.evaluate(() => {
      localStorage.setItem("workspace_theme", "light");
    });
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
    const lightPanel = await openActivitiesLedger(page);
    const lightTable = lightPanel.getByRole("table");
    await expect(lightTable).toHaveCount(1);
    await expect(lightTable.getByText("E2E theme feed")).toBeVisible();
    await expect(lightTable.getByText(/Weight:\s*4\.2 kg/i)).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem("workspace_theme", "dark");
    });
    await page.reload();
    await expect(html).toHaveClass(/dark/);
    const darkPanel = await openActivitiesLedger(page);
    const darkTable = darkPanel.getByRole("table");
    await expect(darkTable).toHaveCount(1);
    await expect(darkTable.getByText("E2E theme feed")).toBeVisible();
    await expect(darkTable.getByText(/Weight:\s*4\.2 kg/i)).toBeVisible();
    // Card chrome still mounts under dark tokens.
    await expect(darkPanel.locator("ul > li")).toHaveCount(2);
  });

  test("old measure URL redirects to growth; timeline still goes to insights", async ({
    page,
  }) => {
    await page.goto("/baby/measure");
    await expect(page).toHaveURL(/\/baby\/growth/);
    await page.goto("/baby/timeline");
    await expect(page).toHaveURL(/\/baby\/insights/);
  });

  test("growth page shows title and save form", async ({ page }) => {
    await gotoBabyHome(page);
    await openCareFormFromMenu(
      page,
      /growth|cân đo/i,
      /\/baby\/growth/,
    );
    await expect(
      page.getByRole("heading", { name: /growth|cân đo/i }),
    ).toBeVisible();
    await expect(
      page.getByTestId("baby-growth-save"),
    ).toBeVisible();
  });

  test("EN ↔ VI toggles from settings", async ({ page }) => {
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await page.goto("/baby/settings");
    await expect(
      page.getByRole("heading", { level: 1, name: /settings|cài đặt/i }),
    ).toBeVisible();

    await expect(async () => {
      await page.getByRole("radio", { name: "Tiếng Việt" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Cài đặt" }),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass();

    await page.goto("/baby");
    await expect(page.getByRole("heading", { name: "Chăm bé" })).toBeVisible();
    await expect(breastL(page)).toBeVisible();
    // Header body also says Trái — scope to the Left breast control.
    await expect(breastL(page).getByText("Trái", { exact: true })).toBeVisible();
    // Header may include · ~ml · n/N when birth is set.
    await expect(bottleHeader(page)).toContainText("Bình sữa");

    await page.goto("/baby/settings");
    await expect(async () => {
      await page.getByRole("radio", { name: "English" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Settings" }),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass();

    await page.goto("/baby");
    await expect(page.getByRole("heading", { name: "Baby Care" })).toBeVisible();
    await expect(breastL(page).getByText("Left", { exact: true })).toBeVisible();
    await expect(bottleHeader(page)).toContainText("Bottle");
  });
});

test.describe("Baby Care capture navigate", () => {
  test.skip(!hasAuthStorage, "needs E2E_STORAGE_STATE for GraphQL writes");

  test("feed timed chip start stays; stop lands on home", async ({ page }) => {
    await page.goto("/baby/feed");
    const breastL = page.getByTestId("baby-feed-method-breast_l");
    await expect(
      breastL.getByText(/tap to start|chạm để bắt đầu/i),
    ).toBeVisible();
    await breastL.getByRole("button").click();
    await expect(page).toHaveURL(/\/baby\/feed/);
    await expect(breastL).toHaveAttribute("data-running", "true");
    await expect(
      breastL.getByText(/tap to stop|chạm để dừng/i),
    ).toBeVisible();
    await breastL.getByRole("button").click();
    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(page.getByTestId("baby-home-status")).toBeVisible();
    await expectStatusRowNotEmpty(page, /last feed|lần bú/i);
  });

  test("pump Pump L stop posts createBabyFeed duration", async ({ page }) => {
    await page.goto("/baby/pump");
    const pumpL = page.getByTestId("baby-pump-method-pump_l");
    await expect(
      pumpL.getByText(/tap to start|chạm để bắt đầu/i),
    ).toBeVisible();
    await pumpL.getByRole("button").click();
    await expect(page).toHaveURL(/\/baby\/pump/);
    await expect(pumpL).toHaveAttribute("data-running", "true");
    await expect(
      pumpL.getByText(/tap to stop|chạm để dừng/i),
    ).toBeVisible();

    const createFeed = page.waitForRequest(
      (req) => {
        if (!req.url().includes("/api/graphql/baby")) return false;
        const body = req.postData() ?? "";
        return /createBabyFeed/i.test(body);
      },
      { timeout: 30_000 },
    );
    await pumpL.getByRole("button").click();
    const req = await createFeed;
    const vars = parseGraphqlVariables(req.postData());
    const input = vars?.input as
      | { method?: string; durationSec?: number }
      | undefined;
    expect(input?.method).toBe("pump_l");
    expect(input?.durationSec).toBeGreaterThanOrEqual(1);

    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(page.getByTestId("baby-home-status")).toBeVisible();
  });

  test("pump Pump R stop posts createBabyFeed duration", async ({ page }) => {
    await page.goto("/baby/pump");
    const pumpR = page.getByTestId("baby-pump-method-pump_r");
    await expect(
      pumpR.getByText(/tap to start|chạm để bắt đầu/i),
    ).toBeVisible();
    await pumpR.getByRole("button").click();
    await expect(page).toHaveURL(/\/baby\/pump/);
    await expect(pumpR).toHaveAttribute("data-running", "true");
    await expect(
      pumpR.getByText(/tap to stop|chạm để dừng/i),
    ).toBeVisible();

    const createFeed = page.waitForRequest(
      (req) => {
        if (!req.url().includes("/api/graphql/baby")) return false;
        const body = req.postData() ?? "";
        return /createBabyFeed/i.test(body);
      },
      { timeout: 30_000 },
    );
    await pumpR.getByRole("button").click();
    const req = await createFeed;
    const vars = parseGraphqlVariables(req.postData());
    const input = vars?.input as
      | { method?: string; durationSec?: number }
      | undefined;
    expect(input?.method).toBe("pump_r");
    expect(input?.durationSec).toBeGreaterThanOrEqual(1);

    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(page.getByTestId("baby-home-status")).toBeVisible();
  });

  test("pump amount chip posts createBabyFeed pump + ml", async ({ page }) => {
    await page.goto("/baby/pump");
    await expect(page.getByTestId("baby-pump-form")).toBeVisible();

    const createFeed = page.waitForRequest(
      (req) => {
        if (!req.url().includes("/api/graphql/baby")) return false;
        const body = req.postData() ?? "";
        return /createBabyFeed/i.test(body);
      },
      { timeout: 30_000 },
    );
    await page.locator('[data-bottle-ml="60"], [data-bottle-ml="90"]').first().click();
    const req = await createFeed;
    const vars = parseGraphqlVariables(req.postData());
    const input = vars?.input as
      | { method?: string; amountMl?: number }
      | undefined;
    expect(input?.method).toBe("pump");
    expect(input?.amountMl).toBeGreaterThan(0);

    await expect(page).toHaveURL(/\/baby\/?$/);
  });

  test("diaper save lands on home", async ({ page }) => {
    await page.goto("/baby/diaper");
    await page.getByRole("button", { name: /wet|ướt/i }).click();
    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(page.getByTestId("baby-home-status")).toBeVisible();
    await expectStatusRowNotEmpty(page, /last diaper|đổi tã/i);
  });

  test("diaper dirty opens sheet then save lands on home", async ({ page }) => {
    await page.goto("/baby/diaper");
    await expect(page.getByTestId("baby-diaper-form")).toBeVisible();
    await expect(page.locator('[data-layout="diaper-kind-2x2"]')).toBeVisible();

    await page.locator('[data-diaper-kind="dirty"]').click();
    const saveDiaper = page.getByRole("button", {
      name: /save diaper|lưu tã/i,
    });
    await expect(saveDiaper).toBeVisible();

    const createDiaper = page.waitForRequest(
      (req) => {
        if (!req.url().includes("/api/graphql/baby")) return false;
        const body = req.postData() ?? "";
        return /createBabyDiaper/i.test(body);
      },
      { timeout: 30_000 },
    );
    await saveDiaper.click();
    const req = await createDiaper;
    const vars = parseGraphqlVariables(req.postData());
    const input = vars?.input as { kind?: string } | undefined;
    expect(input?.kind).toBe("dirty");

    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(page.getByTestId("baby-home-status")).toBeVisible();
  });

  test("feed formula chip posts createBabyFeed formula + ml", async ({
    page,
  }) => {
    await page.goto("/baby/feed");
    await expect(page.getByTestId("baby-feed-form")).toBeVisible();

    const createFeed = page.waitForRequest(
      (req) => {
        if (!req.url().includes("/api/graphql/baby")) return false;
        const body = req.postData() ?? "";
        return /createBabyFeed/i.test(body);
      },
      { timeout: 30_000 },
    );
    await page
      .locator('[data-bottle-ml="60"], [data-bottle-ml="90"]')
      .first()
      .click();
    const req = await createFeed;
    const vars = parseGraphqlVariables(req.postData());
    const input = vars?.input as
      | { method?: string; amountMl?: number }
      | undefined;
    expect(input?.method).toBe("formula");
    expect(input?.amountMl).toBeGreaterThan(0);

    await expect(page).toHaveURL(/\/baby\/?$/);
  });

  test("sleep Start stays; End lands on home", async ({ page }) => {
    const sleepForm = page.getByTestId("baby-sleep-form");
    const startChip = () => page.getByTestId("baby-sleep-start");
    const endChip = () => page.getByTestId("baby-sleep-end");

    async function gotoSleepReady() {
      const openSleepRes = page.waitForResponse(
        (res) => {
          if (!res.url().includes("/api/graphql/baby")) return false;
          const body = res.request().postData() ?? "";
          return /BabyOpenSleep|babyOpenSleep/.test(body);
        },
        { timeout: 60_000 },
      );
      await page.goto("/baby/sleep");
      await expect(sleepForm).toBeVisible({ timeout: 60_000 });
      await openSleepRes;
      // Open-check starts pending (chip disabled); wait until React clears it.
      await expect(sleepForm).toHaveAttribute("data-check-pending", "false", {
        timeout: 30_000,
      });
      const retry = page.getByRole("button", { name: /retry|thử lại/i });
      if (await retry.isVisible().catch(() => false)) {
        await retry.click();
        await expect(sleepForm).toHaveAttribute("data-check-pending", "false", {
          timeout: 30_000,
        });
      }
    }

    await gotoSleepReady();
    // Clear leftover open nap from a prior run before asserting Start stay.
    if (await endChip().isVisible().catch(() => false)) {
      await endChip().getByRole("button").click();
      await expect(page).toHaveURL(/\/baby\/?$/);
      await gotoSleepReady();
    }
    await expect(startChip()).toBeVisible();
    await expect(
      startChip().getByText(/tap to start|chạm để bắt đầu/i),
    ).toBeVisible();
    await expect(startChip().getByRole("button")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await startChip().getByRole("button").click();
    await expect(page).toHaveURL(/\/baby\/sleep/);
    await expect(endChip()).toBeVisible();
    await expect(
      endChip().getByText(/tap to stop|chạm để dừng/i),
    ).toBeVisible();
    await expect(page.getByTestId("baby-sleep-start")).toHaveCount(0);

    await endChip().getByRole("button").click();
    // Done flash paints before home navigate (BABY_CARE_DONE_BEFORE_NAV_MS).
    const sleepChip = page.getByTestId(/baby-sleep-(start|end)/);
    await expect(sleepChip).toHaveAttribute("data-done-flash", "true", {
      timeout: 10_000,
    });
    await expect(sleepChip).toContainText(/Done|Xong/);
    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(page.getByTestId("baby-home-status")).toBeVisible();
  });

  test("vaccine create via Growth shows on Activities and stays on Growth", async ({
    page,
  }) => {
    const unique = `Hexa-${Date.now()}`;
    await page.goto("/baby/growth?kind=vaccine");
    await expect(page.getByTestId("baby-growth-page")).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /^vaccine$|^vắc-xin$/i }),
    ).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("baby-vaccine-name").fill(unique);
    await page.getByRole("radio", { name: /first|mũi 1/i }).click();
    await page.getByTestId("baby-vaccine-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);
    await expect(
      page.getByRole("radio", { name: /weight|cân/i }),
    ).toHaveAttribute("aria-checked", "true");

    await page.goto("/baby/activities");
    await expect(page.getByTestId("baby-activities-page")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(new RegExp(unique, "i")).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("vaccine edit and delete from Activities", async ({ page }) => {
    const unique = `Hexa-${Date.now()}`;
    await page.goto("/baby/growth?kind=vaccine");
    await expect(page.getByTestId("baby-growth-page")).toBeVisible();
    await page.getByTestId("baby-vaccine-name").fill(unique);
    await page.getByRole("radio", { name: /first|mũi 1/i }).click();
    await page.getByTestId("baby-vaccine-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);

    await page.goto("/baby/activities");
    await expect(page.getByTestId("baby-activities-page")).toBeVisible({
      timeout: 15_000,
    });
    const rowText = page.getByText(new RegExp(unique, "i")).first();
    await expect(rowText).toBeVisible({ timeout: 15_000 });
    await rowText
      .locator("xpath=ancestor::tr | ancestor::li")
      .first()
      .getByRole("button", { name: /^edit$|^sửa$/i })
      .click();

    const edited = `${unique}-edited`;
    await page.locator('input[name="name"]').fill(edited);
    await page.locator('select[name="dose"]').selectOption("second");
    await page.getByRole("button", { name: /^save$|^lưu$/i }).click();
    await expect(page.getByText(new RegExp(edited, "i")).first()).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByText(new RegExp(edited, "i"))
      .first()
      .locator("xpath=ancestor::tr | ancestor::li")
      .first()
      .getByRole("button", { name: /^edit$|^sửa$/i })
      .click();
    await page.getByRole("button", { name: /^delete$|^xóa$/i }).click();
    await page
      .getByRole("button", {
        name: /confirm delete|xác nhận xóa|delete forever|xóa vĩnh viễn/i,
      })
      .click();
    await expect(page.getByText(new RegExp(edited, "i"))).toHaveCount(0);
  });

  test("growth chips visible; save stays on Growth and resets to Weight", async ({
    page,
  }) => {
    await page.goto("/baby/growth");
    await expect(page.getByTestId("baby-growth-kind-chips")).toBeVisible();
    await expect(page.getByTestId("baby-growth-recent")).toHaveCount(0);
    await page.getByRole("radio", { name: /weight|cân/i }).click();
    await page.getByTestId("baby-growth-value").fill("4.1");
    await page.getByTestId("baby-growth-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);
    await expect(
      page.getByRole("radio", { name: /weight|cân/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  test("Growth logs medicine and temperature; no Pump capture chip", async ({
    page,
  }) => {
    await page.goto("/baby/growth");
    await expect(page.getByTestId("baby-growth-page")).toBeVisible();

    await page.getByRole("radio", { name: /^medicine$|^thuốc$/i }).click();
    await expect(page.getByTestId("money-amount-field")).toBeVisible();
    await page.getByTestId("baby-growth-name").fill("Paracetamol");
    await page.getByTestId("baby-growth-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);

    await page.getByRole("radio", { name: /temperature|nhiệt/i }).click();
    await expect(page.getByTestId("money-amount-field")).toBeVisible();
    await expect(page.getByTestId("money-category-field")).toBeVisible();
    await expect(page.getByTestId("money-multi-category-field")).toBeVisible();
    await page.getByTestId("baby-growth-value").fill("37.4");
    await page
      .getByTestId("baby-growth-symptoms")
      .getByRole("button", { name: /cough|ho/i })
      .click();
    await page.getByTestId("baby-growth-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);

    await expect(
      page.getByRole("radio", { name: /pumping|hút sữa/i }),
    ).toHaveCount(0);

    await page.goto("/baby/activities");
    await expect(page.getByTestId("baby-activities-page")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Paracetamol/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("/baby/vaccines redirects to Growth with Vaccine chip", async ({
    page,
  }) => {
    await page.goto("/baby/vaccines");
    await expect(page).toHaveURL(/\/baby\/growth\?kind=vaccine/);
    await expect(page.getByTestId("baby-growth-page")).toBeVisible();
    await expect(page.getByTestId("baby-vaccine-dose")).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /^vaccine$|^vắc-xin$/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  test("Growth logs vitamin, height, and head", async ({ page }) => {
    const vitaminName = `VitD-${Date.now()}`;
    await page.goto("/baby/growth");
    await expect(page.getByTestId("baby-growth-page")).toBeVisible();

    await page.getByRole("radio", { name: /^vitamin$/i }).click();
    await page.getByTestId("baby-growth-name").fill(vitaminName);
    await page.getByTestId("baby-growth-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);

    await page.getByRole("radio", { name: /^height$|^chiều cao$/i }).click();
    await page.getByTestId("baby-growth-value").fill("62.5");
    await page.getByTestId("baby-growth-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);

    await page.getByRole("radio", { name: /^head$|^vòng đầu$/i }).click();
    await page.getByTestId("baby-growth-value").fill("41.2");
    await page.getByTestId("baby-growth-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);

    await page.goto("/baby/activities");
    await expect(page.getByTestId("baby-activities-page")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(vitaminName).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Activities delete medicine", async ({ page }) => {
    const unique = `Med-${Date.now()}`;
    await page.goto("/baby/growth");
    await expect(page.getByTestId("baby-growth-page")).toBeVisible();

    await page.getByRole("radio", { name: /^medicine$|^thuốc$/i }).click();
    await page.getByTestId("baby-growth-name").fill(unique);
    await page.getByTestId("baby-growth-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);

    await page.goto("/baby/activities");
    await expect(page.getByTestId("baby-activities-page")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(new RegExp(unique, "i")).first()).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByText(new RegExp(unique, "i"))
      .first()
      .locator("xpath=ancestor::tr | ancestor::li")
      .first()
      .getByRole("button", { name: /^edit$|^sửa$/i })
      .click();
    await page.getByRole("button", { name: /^delete$|^xóa$/i }).click();
    await page
      .getByRole("button", {
        name: /confirm delete|xác nhận xóa|delete forever|xóa vĩnh viễn/i,
      })
      .click();
    await expect(page.getByText(new RegExp(unique, "i"))).toHaveCount(0);
  });

  test("Growth saves symptoms-only temperature without value", async ({
    page,
  }) => {
    await page.goto("/baby/growth");
    await expect(page.getByTestId("baby-growth-page")).toBeVisible();

    await page.getByRole("radio", { name: /temperature|nhiệt/i }).click();
    await page.getByTestId("baby-growth-value").fill("");
    await page
      .getByTestId("baby-growth-symptoms")
      .getByRole("button", { name: /rash|phát ban/i })
      .click();
    await page.getByTestId("baby-growth-save").click();
    await expect(page).toHaveURL(/\/baby\/growth/);

    await page.goto("/baby/activities");
    await expect(page.getByTestId("baby-activities-page")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/rash|phát ban/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("Baby Care insights charts", () => {
  test("default Insights shows Hydration + Night Rest; More insights deferred; Activities owns lists", async ({
    page,
  }) => {
    let timelineFetches = 0;
    let growthFetches = 0;
    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabyTimeline|babyTimeline|BabyInsightsTimeline/.test(body)) {
        timelineFetches += 1;
      }
      if (
        (/BabyGrowth\b|babyGrowthEntries/.test(body) ||
          /query\s+BabyGrowth\b/.test(body)) &&
        !/updateBabyGrowth|UpdateBabyGrowth|deleteBabyGrowth|DeleteBabyGrowth/.test(
          body,
        )
      ) {
        growthFetches += 1;
      }
      await fulfillBabyInsightsGraphql(route);
    });

    await page.goto("/baby/insights");
    await expect(page.getByTestId("baby-insights-default-charts")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("baby-hydration-chart")).toBeVisible();
    await expect(page.getByTestId("baby-night-rest-chart")).toBeVisible();
    await expect(
      page.getByText(/night rest|giấc ngủ đêm/i).first(),
    ).toBeVisible();
    // Purpose copy may say "not efficiency %"; assert we do not title the chart as efficiency.
    await expect(
      page.getByTestId("baby-night-rest-chart").getByText(/^efficiency %$/i),
    ).toHaveCount(0);

    // Date/period only — no care/growth chip filter chrome on Insights.
    await expect(
      page.getByRole("button", { name: /^(care types|loại chăm sóc)\b/i }),
    ).toHaveCount(0);

    await expect(page.getByTestId("baby-more-insights")).toBeVisible();
    await expect(page.getByTestId("baby-activity-log")).toHaveCount(0);
    await expect(page.getByTestId("baby-insights-activities-cue")).toBeVisible();
    await expect(page.getByTestId("baby-more-insights-panel")).toHaveCount(0);
    await expect(page.getByTestId("baby-activities-ledger")).toHaveCount(0);
    await expect(page.getByTestId("baby-count-kpis")).toHaveCount(0);
    expect(timelineFetches).toBe(0);
    expect(growthFetches).toBe(0);

    await page.getByTestId("baby-more-insights").click();
    await expect(page.getByTestId("baby-more-insights-panel")).toBeVisible();
    await expect(page.getByTestId("baby-count-kpis")).toBeVisible();
    await expect(page.getByTestId("baby-insights-charts")).toBeVisible();
    await expect(page.getByTestId("baby-pattern-finder-chart")).toBeVisible();
    await expect(page.getByTestId("baby-awake-trend-chart")).toBeVisible();
    await expect(page.getByTestId("baby-diaper-output-chart")).toBeVisible();
    await expect(page.getByTestId("baby-care-count-chart")).toBeVisible();
    // Decision 2 Option 2: growth enables with moreOpen; timeline stays off Insights.
    expect(timelineFetches).toBe(0);
    await expect.poll(() => growthFetches).toBeGreaterThan(0);

    await page.goto("/baby/activities");
    await expect(page.getByTestId("baby-activities-ledger")).toBeVisible();
    await expect.poll(() => timelineFetches).toBeGreaterThan(0);
  });

  test("More insights shows insight KPI strip with Sleep Efficiency soft-empty", async ({
    page,
  }) => {
    await page.route("**/api/graphql/baby", async (route) => {
      await fulfillBabyInsightsGraphql(route);
    });

    await page.goto("/baby/insights");
    await expect(page.getByTestId("baby-insights-default-charts")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("region", { name: /insight metrics/i }),
    ).toHaveCount(0);

    await page.getByTestId("baby-more-insights").click();
    const insightKpis = page.getByRole("region", {
      name: /insight metrics/i,
    });
    await expect(insightKpis).toBeVisible();
    await expect(
      insightKpis.getByText(/avg wake window|khoảng tỉnh trung bình/i),
    ).toBeVisible();
    await expect(
      insightKpis.getByText(/milk\s*→\s*diaper lag|độ trễ bú\s*→\s*tã/i),
    ).toBeVisible();
    await expect(
      insightKpis.getByText(/sleep efficiency|hiệu suất ngủ/i),
    ).toBeVisible();
    await expect(
      insightKpis.getByText(
        /need night-waking logs to measure efficiency|cần nhật ký thức đêm để đo hiệu suất/i,
      ),
    ).toBeVisible();
    await expect(
      insightKpis.getByText(
        /widen the date range to at least 3 days|mở rộng khoảng ngày ít nhất 3 ngày/i,
      ),
    ).toBeVisible();
    await expect(
      insightKpis.getByText(
        /need more feed and diaper logs|cần thêm nhật ký bú và tã/i,
      ),
    ).toBeVisible();
  });

  test("default charts show purpose / guidance copy", async ({ page }) => {
    await page.route("**/api/graphql/baby", async (route) => {
      await fulfillBabyInsightsGraphql(route);
    });

    await page.goto("/baby/insights");
    const hydration = page.getByTestId("baby-hydration-chart");
    const nightRest = page.getByTestId("baby-night-rest-chart");
    await expect(hydration).toBeVisible({ timeout: 15_000 });
    await expect(nightRest).toBeVisible();

    await expect(
      hydration.getByText(
        /wet diapers vs feeds|tã ướt so với lần bú/i,
      ),
    ).toBeVisible();
    await expect(
      nightRest.getByText(
        /night sleep duration|thời lượng ngủ đêm/i,
      ),
    ).toBeVisible();
    await expect(
      nightRest.getByText(/not efficiency %|không phải % hiệu suất/i),
    ).toBeVisible();

    await page.getByTestId("baby-more-insights").click();
    await expect(page.getByTestId("baby-more-insights-panel")).toBeVisible();
    await expect(
      page
        .getByTestId("baby-pattern-finder-chart")
        .getByText(/sleep blocks and feed\/diaper|khối ngủ và dấu bú\/tã/i),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("baby-awake-trend-chart")
        .getByText(/daily mean wake gaps|khoảng tỉnh trung bình mỗi ngày/i),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("baby-diaper-output-chart")
        .getByText(/wet vs stool mix|tã ướt và hỗn hợp phân/i),
    ).toBeVisible();
  });

  test("hydration low_wet alert shows when series alert fires", async ({
    page,
  }) => {
    const series = {
      ...emptyBabyInsightsSeries(),
      hydration: {
        days: [
          {
            date: "2026-09-14",
            wetCount: 3,
            feedCount: 6,
            formulaMl: null,
          },
        ],
        alert: "low_wet",
        emptyReason: null,
      },
    };

    await page.route("**/api/graphql/baby", async (route) => {
      await fulfillBabyInsightsGraphql(route, { series });
    });

    await page.goto("/baby/insights");
    await expect(page.getByTestId("baby-hydration-chart")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("status").filter({
        hasText:
          /wet diapers look low on a day with feeds|tã ướt thấp trong ngày có bú/i,
      }),
    ).toBeVisible();
  });

  test("More insights diaper watery alert shows when series high_watery", async ({
    page,
  }) => {
    const series = {
      ...emptyBabyInsightsSeries(),
      diaperOutput: {
        buckets: { wet: 2, normal: 3, watery: 4, blowouts: 0 },
        alert: "high_watery",
        emptyReason: null,
      },
    };

    await page.route("**/api/graphql/baby", async (route) => {
      await fulfillBabyInsightsGraphql(route, { series });
    });

    await page.goto("/baby/insights");
    await expect(page.getByTestId("baby-insights-default-charts")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("status").filter({
        hasText:
          /loose-watery stools look high|phân loãng cao/i,
      }),
    ).toHaveCount(0);

    await page.getByTestId("baby-more-insights").click();
    await expect(page.getByTestId("baby-more-insights-panel")).toBeVisible();
    await expect(page.getByTestId("baby-diaper-output-chart")).toBeVisible();
    await expect(
      page.getByRole("status").filter({
        hasText:
          /loose-watery stools look high|phân loãng cao/i,
      }),
    ).toBeVisible();
  });

  test("default charts show soft-empty copy when series is thin", async ({
    page,
  }) => {
    await page.route("**/api/graphql/baby", async (route) => {
      await fulfillBabyInsightsGraphql(route);
    });

    await page.goto("/baby/insights");
    const hydration = page.getByTestId("baby-hydration-chart");
    const nightRest = page.getByTestId("baby-night-rest-chart");
    await expect(hydration).toBeVisible({ timeout: 15_000 });
    await expect(nightRest).toBeVisible();

    await expect(
      hydration.getByText(
        /need more feed or diaper logs|cần thêm nhật ký bú hoặc tã/i,
      ),
    ).toBeVisible();
    await expect(
      nightRest.getByText(
        /need more completed sleep logs for night rest|cần thêm nhật ký ngủ đã kết thúc cho giấc đêm/i,
      ),
    ).toBeVisible();
  });

  test("Activities care edit save hits updateBabyEvent and refreshes row", async ({
    page,
  }) => {
    const mutations: string[] = [];
    let feedSummary = "Bottle · 120 ml";
    let feedAmountMl = 120;

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/UpdateBabyEvent|updateBabyEvent/.test(body)) {
        mutations.push("updateBabyEvent");
        try {
          const parsed = JSON.parse(body) as {
            variables?: { input?: { payload?: { amountMl?: number } } };
          };
          const ml = parsed.variables?.input?.payload?.amountMl;
          if (typeof ml === "number") {
            feedAmountMl = ml;
            feedSummary = `Bottle · ${ml} ml`;
          }
        } catch {
          /* keep prior */
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { updateBabyEvent: { id: "e2e-edit-feed" } },
          }),
        });
        return;
      }
      if (/UpdateBabyGrowth|updateBabyGrowth/.test(body)) {
        mutations.push("updateBabyGrowth");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { updateBabyGrowth: { id: "should-not-run" } },
          }),
        });
        return;
      }
      await fulfillBabyInsightsGraphql(route, {
        timeline: {
          babyTimeline: {
            items: [
              {
                id: "e2e-edit-feed",
                kind: "care",
                type: "feed",
                at: "2026-09-05T10:12:00.000Z",
                endedAt: null,
                payload: { method: "bottle", amountMl: feedAmountMl },
                summary: feedSummary,
                source: "web",
                cursor: "c1",
              },
            ],
            nextCursor: null,
          },
        },
      });
    });

    await page.goto("/baby/activities");
    const panel = page.getByTestId("baby-activities-ledger");
    await expect(panel).toBeVisible();
    const activityTable = panel.getByRole("table");
    await expect(activityTable.getByText(/Bottle · 120 ml/i)).toBeVisible();

    await activityTable.getByRole("row").filter({ hasText: /Feed/i })
      .getByRole("button", { name: /^edit$|^sửa$/i })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/amount \(ml\)|lượng \(ml\)/i).fill("150");
    await dialog.getByRole("button", { name: /^save$|^lưu$/i }).click();

    await expect(dialog).toHaveCount(0);
    await expect.poll(() => mutations).toEqual(["updateBabyEvent"]);
    await expect(activityTable.getByText(/Bottle · 150 ml/i)).toBeVisible();
    await expect(activityTable.getByText(/Bottle · 120 ml/i)).toHaveCount(0);
  });

  test("Activities growth edit save hits updateBabyGrowth and refreshes row", async ({
    page,
  }) => {
    const mutations: string[] = [];
    let weightValue = 4.2;

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/UpdateBabyGrowth|updateBabyGrowth/.test(body)) {
        mutations.push("updateBabyGrowth");
        try {
          const parsed = JSON.parse(body) as {
            variables?: { input?: { valueNum?: number } };
          };
          const v = parsed.variables?.input?.valueNum;
          if (typeof v === "number") weightValue = v;
        } catch {
          /* keep prior */
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { updateBabyGrowth: { id: "e2e-edit-weight" } },
          }),
        });
        return;
      }
      if (/UpdateBabyEvent|updateBabyEvent/.test(body)) {
        mutations.push("updateBabyEvent");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { updateBabyEvent: { id: "should-not-run" } },
          }),
        });
        return;
      }
      await fulfillBabyInsightsGraphql(route, {
        growth: {
          babyGrowthEntries: {
            items: [
              growthEntryFixture("e2e-edit-weight", weightValue),
            ],
            nextCursor: null,
          },
        },
      });
    });

    await page.goto("/baby/activities");
    const panel = page.getByTestId("baby-activities-ledger");
    await expect(panel).toBeVisible();
    const activityTable = panel.getByRole("table");
    await expect(activityTable.getByText(/4\.2 kg/i)).toBeVisible();

    await activityTable
      .getByRole("row")
      .filter({ hasText: /Weight|Cân/i })
      .getByRole("button", { name: /^edit$|^sửa$/i })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const valueInput = dialog.getByLabel(/^value$|^giá trị$/i);
    await valueInput.fill("4.5");
    await valueInput.blur();

    const saveResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/graphql/baby") &&
        /updateBabyGrowth/i.test(res.request().postData() ?? ""),
      { timeout: 15_000 },
    );
    await dialog.getByRole("button", { name: /^save$|^lưu$/i }).click();
    await saveResponse;

    await expect(dialog).toHaveCount(0);
    await expect.poll(() => mutations).toEqual(["updateBabyGrowth"]);
    await expect(activityTable.getByText(/4\.5 kg/i)).toBeVisible();
    await expect(activityTable.getByText(/4\.2 kg/i)).toHaveCount(0);
  });

  test("Activities edit validation fail shows inline error and skips mutation", async ({
    page,
  }) => {
    const mutations: string[] = [];
    const sleepSummary = "Ended sleep · 1h 5m";

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (
        /UpdateBabyEvent|updateBabyEvent|UpdateBabyGrowth|updateBabyGrowth/.test(
          body,
        )
      ) {
        mutations.push("mutation");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { updateBabyEvent: { id: "should-not-run" } },
          }),
        });
        return;
      }
      await fulfillBabyInsightsGraphql(route, {
        timeline: {
          babyTimeline: {
            items: [
              {
                id: "e2e-edit-sleep",
                kind: "care",
                type: "sleep",
                at: "2026-09-05T08:00:00.000Z",
                endedAt: "2026-09-05T09:05:00.000Z",
                payload: {},
                summary: sleepSummary,
                source: "web",
                cursor: "c1",
              },
            ],
            nextCursor: null,
          },
        },
      });
    });

    await page.goto("/baby/activities");
    const panel = page.getByTestId("baby-activities-ledger");
    await expect(panel).toBeVisible();
    const activityTable = panel.getByRole("table");
    await expect(activityTable.getByText(sleepSummary)).toBeVisible();

    await activityTable
      .getByRole("row")
      .filter({ hasText: /Sleep|Ngủ/i })
      .getByRole("button", { name: /^edit$|^sửa$/i })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // End before start → client validation; mutation must not fire.
    const occurred = await dialog
      .getByLabel(/^when$|^thời điểm$/i)
      .inputValue();
    await dialog.getByLabel(/^ended$|^kết thúc$/i).fill(
      occurred.slice(0, 11) + "06:00",
    );
    await dialog.getByRole("button", { name: /^save$|^lưu$/i }).click();

    await expect(dialog.getByRole("alert")).toContainText(
      /end time must be after start/i,
    );
    expect(mutations).toEqual([]);
    await expect(dialog).toBeVisible();
    await expect(activityTable.getByText(sleepSummary)).toBeVisible();
  });

  test("Activities selection bar: checkbox, Edit enabled for 1, disabled visible for 2", async ({
    page,
  }) => {
    await page.route("**/api/graphql/baby", async (route) => {
      await fulfillBabyInsightsGraphql(route, {
        timeline: {
          babyTimeline: {
            items: [
              {
                id: "e2e-sel-feed",
                kind: "care",
                type: "feed",
                at: "2026-09-05T10:12:00.000Z",
                endedAt: null,
                payload: { method: "bottle", amountMl: 120 },
                summary: "Bottle · 120 ml",
                source: "web",
                cursor: "c1",
              },
            ],
            nextCursor: null,
          },
        },
        growth: {
          babyGrowthEntries: {
            items: [growthEntryFixture("e2e-sel-weight", 4.2)],
            nextCursor: null,
          },
        },
      });
    });

    const panel = await openActivitiesLedger(page);
    const table = panel.getByRole("table");
    await expect(table.getByRole("checkbox").first()).toBeVisible();

    const feedRow = table.getByRole("row").filter({ hasText: /Feed|Bú/i });
    await checkActivityCheckbox(feedRow.getByRole("checkbox"));

    const bar = page.getByTestId("baby-activity-selection-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(/activity selected|hoạt động/i);
    const editBtn = bar.getByRole("button", { name: /^edit$|^sửa$/i });
    const deleteBtn = bar.getByRole("button", { name: /^delete$|^xóa$/i });
    const clearBtn = bar.getByRole("button", { name: /^clear$|^bỏ chọn$/i });
    await expect(editBtn).toBeEnabled();
    await expect(deleteBtn).toBeEnabled();
    await expect(clearBtn).toBeEnabled();

    await editBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /^cancel$|^hủy$/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const weightRow = table.getByRole("row").filter({ hasText: /Weight|Cân/i });
    await checkActivityCheckbox(weightRow.getByRole("checkbox"));
    await expect(editBtn).toBeVisible();
    await expect(editBtn).toBeDisabled();
    await expect(deleteBtn).toBeEnabled();

    // Whole-row click must not open edit.
    await feedRow.click({ position: { x: 120, y: 10 } });
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await feedRow.getByRole("button", { name: /^edit$|^sửa$/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("Activities keeps selection on show more; clears via bar Clear", async ({
    page,
  }) => {
    const pageOneCount = BABY_INSIGHTS_LIST_VISIBLE_CAP + 1;
    const pageOneItems = Array.from({ length: pageOneCount }, (_, i) =>
      growthEntryFixture(
        `e2e-keep-${i}`,
        i === 0 ? 7.77 : 4.2,
        i === 0
          ? "2026-09-15T09:00:00.000Z"
          : "2026-09-14T09:00:00.000Z",
      ),
    );

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await fulfillBabySyncConfig(route);
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyTimeline: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyGrowthEntries: {
                items: pageOneItems,
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      await route.continue();
    });

    const panel = await openActivitiesLedger(page);
    const table = panel.getByRole("table");
    const firstDataRow = table.getByRole("row").nth(1);
    await checkActivityCheckbox(firstDataRow.getByRole("checkbox"));
    const bar = page.getByTestId("baby-activity-selection-bar");
    await expect(bar).toBeVisible();

    await panel
      .getByRole("button", { name: /show more rows|hiện thêm/i })
      .click();
    await expect(bar).toBeVisible();
    await expect(firstDataRow.getByRole("checkbox")).toBeChecked();

    await bar.getByRole("button", { name: /^clear$|^bỏ chọn$/i }).click();
    await expect(page.getByTestId("baby-activity-selection-bar")).toHaveCount(0);
    await expect(firstDataRow.getByRole("checkbox")).not.toBeChecked();
  });

  test("Activities keeps selection on load more", async ({ page }) => {
    // nextCursor unlocks Load more; older page-two row appends so selected row stays identifiable.
    const pageOneItems = [
      growthEntryFixture(
        "e2e-load-keep-0",
        7.77,
        "2026-09-15T09:00:00.000Z",
      ),
      growthEntryFixture(
        "e2e-load-keep-1",
        4.2,
        "2026-09-14T09:00:00.000Z",
      ),
    ];
    const pageTwoItem = growthEntryFixture(
      "e2e-load-keep-more",
      8.88,
      "2026-09-13T09:00:00.000Z",
    );
    let loadMoreCalls = 0;

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await fulfillBabySyncConfig(route);
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyTimeline: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        const variables = parseGraphqlVariables(body);
        const cursor =
          typeof variables?.cursor === "string" ? variables.cursor : null;
        if (cursor === "g2") {
          loadMoreCalls += 1;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                babyGrowthEntries: {
                  items: [pageTwoItem],
                  nextCursor: null,
                },
              },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyGrowthEntries: {
                items: pageOneItems,
                nextCursor: "g2",
              },
            },
          }),
        });
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      await route.continue();
    });

    const panel = await openActivitiesLedger(page);
    const table = panel.getByRole("table");
    const selectedRow = table.getByRole("row").filter({ hasText: /7\.77 kg/i });
    await checkActivityCheckbox(selectedRow.getByRole("checkbox"));
    const bar = page.getByTestId("baby-activity-selection-bar");
    await expect(bar).toBeVisible();

    const loadMore = panel.getByRole("button", {
      name: /load more|tải thêm/i,
    });
    await expect(loadMore).toBeVisible();
    await loadMore.click();
    await expect.poll(() => loadMoreCalls).toBeGreaterThan(0);
    await expect(table.getByText(/8\.88 kg/i)).toBeVisible();
    await expect(bar).toBeVisible();
    await expect(selectedRow.getByRole("checkbox")).toBeChecked();
  });

  test("Activities multi-delete: cancel confirm, mixed mutations, partial fail Alert", async ({
    page,
  }) => {
    const deletes: string[] = [];
    let feedGone = false;
    let growthGone = false;

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/DeleteBabyEvent|deleteBabyEvent/.test(body)) {
        deletes.push("deleteBabyEvent");
        feedGone = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { deleteBabyEvent: { id: "e2e-del-feed" } },
          }),
        });
        return;
      }
      if (/DeleteBabyGrowth|deleteBabyGrowth/.test(body)) {
        deletes.push("deleteBabyGrowth");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            errors: [{ message: "NOT_FOUND" }],
            data: null,
          }),
        });
        return;
      }
      await fulfillBabyInsightsGraphql(route, {
        timeline: {
          babyTimeline: {
            items: feedGone
              ? []
              : [
                  {
                    id: "e2e-del-feed",
                    kind: "care",
                    type: "feed",
                    at: "2026-09-05T10:12:00.000Z",
                    endedAt: null,
                    payload: { method: "bottle", amountMl: 90 },
                    summary: "Bottle · 90 ml",
                    source: "web",
                    cursor: "c1",
                  },
                ],
            nextCursor: null,
          },
        },
        growth: {
          babyGrowthEntries: {
            items: growthGone
              ? []
              : [growthEntryFixture("e2e-del-weight", 5.5)],
            nextCursor: null,
          },
        },
      });
    });

    const panel = await openActivitiesLedger(page);
    const table = panel.getByRole("table");

    const feedCheckbox = table
      .getByRole("row")
      .filter({ hasText: /Feed|Bú/i })
      .getByRole("checkbox");
    const weightCheckbox = table
      .getByRole("row")
      .filter({ hasText: /Weight|Cân/i })
      .getByRole("checkbox");
    await checkActivityCheckbox(feedCheckbox);
    await checkActivityCheckbox(weightCheckbox);

    const bar = page.getByTestId("baby-activity-selection-bar");
    await expect(bar).toContainText(/2 activities selected|2 hoạt động/i);

    page.once("dialog", (dialog) => dialog.dismiss());
    await bar.getByRole("button", { name: /^delete$|^xóa$/i }).click();
    await expect.poll(() => deletes.length).toBe(0);
    // Cancel = no-op: selection count + both checkboxes unchanged (not only deletes===0).
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(/2 activities selected|2 hoạt động/i);
    await expect(feedCheckbox).toBeChecked();
    await expect(weightCheckbox).toBeChecked();

    page.once("dialog", (dialog) => dialog.accept());
    await bar.getByRole("button", { name: /^delete$|^xóa$/i }).click();
    await expect.poll(() => [...deletes].sort()).toEqual([
      "deleteBabyEvent",
      "deleteBabyGrowth",
    ]);

    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(panel.getByRole("alert")).toContainText(
      /couldn.?t delete some activities|không xóa được một số/i,
    );
    await expect(table.getByText(/Bottle · 90 ml/i)).toHaveCount(0);
    await expect(table.getByText(/5\.5 kg/i)).toBeVisible();
    await expect(
      table.getByRole("row").filter({ hasText: /Weight|Cân/i }).getByRole("checkbox"),
    ).toBeChecked();
  });

  test("Activities multi-delete: full success clears selection and bar", async ({
    page,
  }) => {
    const deletes: string[] = [];
    let feedGone = false;
    let growthGone = false;

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/DeleteBabyEvent|deleteBabyEvent/.test(body)) {
        deletes.push("deleteBabyEvent");
        feedGone = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { deleteBabyEvent: { id: "e2e-ok-feed" } },
          }),
        });
        return;
      }
      if (/DeleteBabyGrowth|deleteBabyGrowth/.test(body)) {
        deletes.push("deleteBabyGrowth");
        growthGone = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { deleteBabyGrowth: { id: "e2e-ok-weight" } },
          }),
        });
        return;
      }
      await fulfillBabyInsightsGraphql(route, {
        timeline: {
          babyTimeline: {
            items: feedGone
              ? []
              : [
                  {
                    id: "e2e-ok-feed",
                    kind: "care",
                    type: "feed",
                    at: "2026-09-05T10:12:00.000Z",
                    endedAt: null,
                    payload: { method: "bottle", amountMl: 80 },
                    summary: "Bottle · 80 ml",
                    source: "web",
                    cursor: "c1",
                  },
                ],
            nextCursor: null,
          },
        },
        growth: {
          babyGrowthEntries: {
            items: growthGone
              ? []
              : [growthEntryFixture("e2e-ok-weight", 6.1)],
            nextCursor: null,
          },
        },
      });
    });

    const panel = await openActivitiesLedger(page);
    const table = panel.getByRole("table");
    await checkActivityCheckbox(
      table.getByRole("row").filter({ hasText: /Feed|Bú/i }).getByRole("checkbox"),
    );
    await checkActivityCheckbox(
      table.getByRole("row").filter({ hasText: /Weight|Cân/i }).getByRole("checkbox"),
    );

    const bar = page.getByTestId("baby-activity-selection-bar");
    page.once("dialog", (dialog) => dialog.accept());
    await bar.getByRole("button", { name: /^delete$|^xóa$/i }).click();

    await expect.poll(() => [...deletes].sort()).toEqual([
      "deleteBabyEvent",
      "deleteBabyGrowth",
    ]);
    await expect(page.getByTestId("baby-activity-selection-bar")).toHaveCount(0);
    await expect(panel.getByRole("alert")).toHaveCount(0);
    await expect(table.getByText(/Bottle · 80 ml/i)).toHaveCount(0);
    await expect(table.getByText(/6\.1 kg/i)).toHaveCount(0);
  });

  test("Activities multi-delete: failed key pruned when row leaves list", async ({
    page,
  }) => {
    const deletes: string[] = [];
    let feedGone = false;
    let growthGone = false;

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/DeleteBabyEvent|deleteBabyEvent/.test(body)) {
        deletes.push("deleteBabyEvent");
        feedGone = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { deleteBabyEvent: { id: "e2e-gone-feed" } },
          }),
        });
        return;
      }
      if (/DeleteBabyGrowth|deleteBabyGrowth/.test(body)) {
        deletes.push("deleteBabyGrowth");
        // Mutation rejects, but refetch also omits the row (already gone server-side).
        growthGone = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            errors: [{ message: "NOT_FOUND" }],
            data: null,
          }),
        });
        return;
      }
      await fulfillBabyInsightsGraphql(route, {
        timeline: {
          babyTimeline: {
            items: feedGone
              ? []
              : [
                  {
                    id: "e2e-gone-feed",
                    kind: "care",
                    type: "feed",
                    at: "2026-09-05T10:12:00.000Z",
                    endedAt: null,
                    payload: { method: "bottle", amountMl: 70 },
                    summary: "Bottle · 70 ml",
                    source: "web",
                    cursor: "c1",
                  },
                ],
            nextCursor: null,
          },
        },
        growth: {
          babyGrowthEntries: {
            items: growthGone
              ? []
              : [growthEntryFixture("e2e-gone-weight", 5.2)],
            nextCursor: null,
          },
        },
      });
    });

    const panel = await openActivitiesLedger(page);
    const table = panel.getByRole("table");
    await checkActivityCheckbox(
      table.getByRole("row").filter({ hasText: /Feed|Bú/i }).getByRole("checkbox"),
    );
    await checkActivityCheckbox(
      table.getByRole("row").filter({ hasText: /Weight|Cân/i }).getByRole("checkbox"),
    );

    const bar = page.getByTestId("baby-activity-selection-bar");
    page.once("dialog", (dialog) => dialog.accept());
    await bar.getByRole("button", { name: /^delete$|^xóa$/i }).click();

    await expect.poll(() => [...deletes].sort()).toEqual([
      "deleteBabyEvent",
      "deleteBabyGrowth",
    ]);
    // Failed growth key must prune when post-invalidate list omits it (stillVisible wiring).
    await expect(page.getByTestId("baby-activity-selection-bar")).toHaveCount(0);
    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(panel.getByRole("alert")).toContainText(
      /couldn.?t delete some activities|không xóa được một số/i,
    );
    await expect(table.getByText(/Bottle · 70 ml/i)).toHaveCount(0);
    await expect(table.getByText(/5\.2 kg/i)).toHaveCount(0);
  });

  test("Activities multi-delete: all-fail Alert keeps selection", async ({
    page,
  }) => {
    const deletes: string[] = [];

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/DeleteBabyEvent|deleteBabyEvent/.test(body)) {
        deletes.push("deleteBabyEvent");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            errors: [{ message: "NOT_FOUND" }],
            data: null,
          }),
        });
        return;
      }
      if (/DeleteBabyGrowth|deleteBabyGrowth/.test(body)) {
        deletes.push("deleteBabyGrowth");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            errors: [{ message: "NOT_FOUND" }],
            data: null,
          }),
        });
        return;
      }
      await fulfillBabyInsightsGraphql(route, {
        timeline: {
          babyTimeline: {
            items: [
              {
                id: "e2e-allfail-feed",
                kind: "care",
                type: "feed",
                at: "2026-09-05T10:12:00.000Z",
                endedAt: null,
                payload: { method: "bottle", amountMl: 60 },
                summary: "Bottle · 60 ml",
                source: "web",
                cursor: "c1",
              },
            ],
            nextCursor: null,
          },
        },
        growth: {
          babyGrowthEntries: {
            items: [growthEntryFixture("e2e-allfail-weight", 4.8)],
            nextCursor: null,
          },
        },
      });
    });

    const panel = await openActivitiesLedger(page);
    const table = panel.getByRole("table");
    await checkActivityCheckbox(
      table.getByRole("row").filter({ hasText: /Feed|Bú/i }).getByRole("checkbox"),
    );
    await checkActivityCheckbox(
      table.getByRole("row").filter({ hasText: /Weight|Cân/i }).getByRole("checkbox"),
    );

    const bar = page.getByTestId("baby-activity-selection-bar");
    page.once("dialog", (dialog) => dialog.accept());
    await bar.getByRole("button", { name: /^delete$|^xóa$/i }).click();

    await expect.poll(() => [...deletes].sort()).toEqual([
      "deleteBabyEvent",
      "deleteBabyGrowth",
    ]);
    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(panel.getByRole("alert")).toContainText(
      /couldn.?t delete activities|không xóa được hoạt động/i,
    );
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(/2 activities selected|2 hoạt động/i);
    await expect(
      table.getByRole("row").filter({ hasText: /Feed|Bú/i }).getByRole("checkbox"),
    ).toBeChecked();
    await expect(
      table.getByRole("row").filter({ hasText: /Weight|Cân/i }).getByRole("checkbox"),
    ).toBeChecked();
  });

  test("Activities delete: busy disables Delete mid-flight; re-enables after fail settle; confirmOne", async ({
    page,
  }) => {
    const deletes: string[] = [];
    let releaseDelete!: () => void;
    const deleteGate = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/DeleteBabyEvent|deleteBabyEvent/.test(body)) {
        deletes.push("deleteBabyEvent");
        await deleteGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            errors: [{ message: "NOT_FOUND" }],
            data: null,
          }),
        });
        return;
      }
      await fulfillBabyInsightsGraphql(route, {
        timeline: {
          babyTimeline: {
            items: [
              {
                id: "e2e-busy-feed",
                kind: "care",
                type: "feed",
                at: "2026-09-05T10:12:00.000Z",
                endedAt: null,
                payload: { method: "bottle", amountMl: 55 },
                summary: "Bottle · 55 ml",
                source: "web",
                cursor: "c1",
              },
            ],
            nextCursor: null,
          },
        },
        growth: {
          babyGrowthEntries: {
            items: [],
            nextCursor: null,
          },
        },
      });
    });

    const panel = await openActivitiesLedger(page);
    const table = panel.getByRole("table");
    await checkActivityCheckbox(
      table.getByRole("row").filter({ hasText: /Feed|Bú/i }).getByRole("checkbox"),
    );

    const bar = page.getByTestId("baby-activity-selection-bar");
    const deleteBtn = bar.getByRole("button", { name: /^delete$|^xóa$/i });
    const clearBtn = bar.getByRole("button", { name: /^clear$|^bỏ chọn$/i });
    await expect(deleteBtn).toBeEnabled();

    page.once("dialog", (dialog) => {
      // Nit: single-row bar Delete uses confirmOne copy (not many).
      expect(dialog.message()).toMatch(
        /Delete 1 activity\?|Xóa 1 hoạt động\?/i,
      );
      void dialog.accept();
    });
    await deleteBtn.click();

    // Mutation arrived but fulfill is gated — busy must disable Delete/Clear
    // and row select/Edit (not only the bar).
    await expect.poll(() => deletes.length).toBe(1);
    await expect(deleteBtn).toBeDisabled();
    await expect(clearBtn).toBeDisabled();
    const rowCheckbox = table
      .getByRole("row")
      .filter({ hasText: /Feed|Bú/i })
      .getByRole("checkbox");
    const rowEdit = table
      .getByRole("row")
      .filter({ hasText: /Feed|Bú/i })
      .getByRole("button", { name: /^edit$|^sửa$/i });
    await expect(rowCheckbox).toBeDisabled();
    await expect(rowEdit).toBeDisabled();

    releaseDelete();
    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(panel.getByRole("alert")).toContainText(
      /couldn.?t delete activities|không xóa được hoạt động/i,
    );
    // Bar stays after fail settle; busy cleared so Delete is usable again.
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(/activity selected|hoạt động/i);
    await expect(deleteBtn).toBeEnabled();
    await expect(clearBtn).toBeEnabled();
    await expect(rowCheckbox).toBeEnabled();
    await expect(rowEdit).toBeEnabled();
  });

  test("Activities clears selection on filter apply, bar Clear, and select-all is visible window only", async ({
    page,
  }) => {
    const pageOneCount = BABY_INSIGHTS_LIST_VISIBLE_CAP + 2;
    const pageOneItems = Array.from({ length: pageOneCount }, (_, i) =>
      growthEntryFixture(
        `e2e-selall-${i}`,
        i === 0 ? 8.8 : 4.2,
        i === 0
          ? "2026-09-15T09:00:00.000Z"
          : "2026-09-14T09:00:00.000Z",
      ),
    );

    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabySyncConfig|babySyncConfig/.test(body)) {
        await fulfillBabySyncConfig(route);
        return;
      }
      if (/BabyTimeline|babyTimeline/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyTimeline: {
                items: [
                  {
                    id: "e2e-selall-feed",
                    kind: "care",
                    type: "feed",
                    at: "2026-09-16T10:00:00.000Z",
                    endedAt: null,
                    payload: { method: "bottle", amountMl: 50 },
                    summary: "Bottle · 50 ml",
                    source: "web",
                    cursor: "c1",
                  },
                ],
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyGrowth|babyGrowthEntries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              babyGrowthEntries: {
                items: pageOneItems,
                nextCursor: null,
              },
            },
          }),
        });
        return;
      }
      if (/BabyInsightsSeries|babyInsightsSeries/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { babyInsightsSeries: emptyBabyInsightsSeries() },
          }),
        });
        return;
      }
      await route.continue();
    });

    const panel = await openActivitiesLedger(page);
    const table = panel.getByRole("table");

    // Select-all = visible window only (not unloaded / beyond-cap rows).
    const headerSelectAll = table.getByRole("checkbox", {
      name: /select all visible activities|chọn mọi hoạt động/i,
    });
    await checkActivityCheckbox(headerSelectAll);
    const bar = page.getByTestId("baby-activity-selection-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(
      new RegExp(
        `${BABY_INSIGHTS_LIST_VISIBLE_CAP} activities selected|${BABY_INSIGHTS_LIST_VISIBLE_CAP} hoạt động`,
        "i",
      ),
    );
    // Header + visible rows; beyond-cap rows are not in the table yet.
    await expect(table.getByRole("row")).toHaveCount(
      BABY_INSIGHTS_LIST_VISIBLE_CAP + 1,
    );

    // Bar Clear empties selection without mutations.
    await bar.getByRole("button", { name: /^clear$|^bỏ chọn$/i }).click();
    await expect(page.getByTestId("baby-activity-selection-bar")).toHaveCount(0);

    // Filter-apply clears selection (design lock #12).
    await checkActivityCheckbox(table.getByRole("row").nth(1).getByRole("checkbox"));
    await expect(page.getByTestId("baby-activity-selection-bar")).toBeVisible();

    const careOrFilter = page.getByRole("button", {
      name: /^(care types|loại chăm sóc|filter)\b/i,
    });
    await expect(careOrFilter.first()).toBeVisible({ timeout: 15_000 });
    const chromeLabel = (await careOrFilter.first().innerText()).toLowerCase();
    if (chromeLabel.startsWith("filter")) {
      await careOrFilter.first().click();
      await page.getByRole("button", { name: /^feed$|^bú$/i }).click();
      await page
        .getByRole("button", { name: /apply filters|áp dụng bộ lọc/i })
        .click();
    } else {
      await careOrFilter.first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: /^feed$|^bú$/i }).click();
      await page
        .getByLabel("Insights filters")
        .getByRole("button", { name: /^apply$|^áp dụng$/i })
        .click();
    }

    await expect(page.getByTestId("baby-activity-selection-bar")).toHaveCount(0);
  });

  test("Insights shows chart region, care-count, and growth chart cards", async ({
    page,
  }) => {
    // Mock like timeline Breast L/R: unauthenticated GraphQL would UNAUTHORIZED
    // and hide the charts grid (growthSection === "error").
    await page.route("**/api/graphql/baby", async (route) => {
      await fulfillBabyInsightsGraphql(route);
    });

    await page.goto("/baby/insights");
    await page.getByTestId("baby-more-insights").click();
    await expect(page.getByTestId("baby-insights-charts")).toBeVisible({
      timeout: 15_000,
    });
    // Care-count card always mounts (empty or with series legend).
    await expect(page.getByTestId("baby-care-count-chart")).toBeVisible();
    // Empty measures filter → all kinds; cards mount even with no points.
    await expect(page.getByTestId("baby-growth-chart-card").first()).toBeVisible();
  });

  test("Insights empty growth chart copy is date-range only", async ({
    page,
  }) => {
    await page.route("**/api/graphql/baby", async (route) => {
      await fulfillBabyInsightsGraphql(route);
    });

    await page.goto("/baby/insights");
    await page.getByTestId("baby-more-insights").click();
    const charts = page.getByTestId("baby-insights-charts");
    await expect(charts).toBeVisible({ timeout: 15_000 });

    const emptyCopy = charts
      .getByTestId("baby-growth-chart-card")
      .first()
      .getByText(
        /no measurements in this range to chart|không có cân đo trong khoảng này để vẽ biểu đồ/i,
      );
    await expect(emptyCopy).toBeVisible();
    await expect(emptyCopy).toHaveClass(/text-muted/);

    // Date-range recovery only — never care/kind filter advice.
    await expect(
      charts.getByText(
        /care types|growth kinds|in the filters|loại chăm sóc|loại cân đo|bộ lọc/i,
      ),
    ).toHaveCount(0);
  });

  test("activities ledger shows Breast L/R, stop time, and compact duration", async ({
    page,
  }) => {
    // Mock care rows so labels/duration/stop clock are deterministic.
    await page.route("**/api/graphql/baby", async (route) => {
      await fulfillBabyInsightsGraphql(route, {
        timeline: {
          babyTimeline: {
            items: [
              {
                id: "e2e-breast-l",
                kind: "care",
                type: "feed",
                at: "2026-09-05T10:12:00.000Z",
                endedAt: null,
                payload: { method: "breast_l", durationSec: 720 },
                summary: "Feed (Breast L) · 12m",
                source: "web",
                cursor: "c1",
              },
              {
                id: "e2e-breast-r",
                kind: "care",
                type: "feed",
                at: "2026-09-05T12:05:00.000Z",
                endedAt: null,
                payload: { method: "breast_r", durationSec: 3900 },
                summary: "Feed (Breast R) · 1h 5m",
                source: "web",
                cursor: "c2",
              },
              {
                id: "e2e-sleep-closed",
                kind: "care",
                type: "sleep",
                at: "2026-09-05T08:00:00.000Z",
                endedAt: "2026-09-05T09:05:00.000Z",
                payload: {},
                summary: "Ended sleep · 1h 5m",
                source: "web",
                cursor: "c3",
              },
            ],
            nextCursor: null,
          },
        },
      });
    });

    await page.goto("/baby/activities");
    await expect(page.getByTestId("baby-activities-ledger")).toBeVisible();

    const activityTable = page.getByRole("table");
    await expect(
      activityTable.getByText(/Feed \(Breast L\)/i).first(),
    ).toBeVisible();
    await expect(
      activityTable.getByText(/Feed \(Breast R\)/i).first(),
    ).toBeVisible();
    await expect(
      activityTable.getByText(/12m/i).first(),
    ).toBeVisible();
    await expect(
      activityTable.locator('time[datetime="2026-09-05T10:12:00.000Z"]'),
    ).toBeVisible();
    await expect(
      activityTable.locator('time[datetime="2026-09-05T12:05:00.000Z"]'),
    ).toBeVisible();
  });

  test("hamburger excludes Log vaccines; keeps Log growth", async ({ page }) => {
    await page.goto("/baby/settings");
    await openAppMenu(page);
    await expect(
      page.getByRole("link", { name: /log vaccines|ghi vắc-xin/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /log growth|ghi cân đo/i }),
    ).toBeVisible();
  });

  test("hamburger Baby items use dedicated SVGs not Money bills/import/spending", async ({
    page,
  }) => {
    await page.goto("/baby/settings");
    await openAppMenu(page);

    const feed = page.getByRole("link", { name: /log feed|ghi bú/i });
    const sleep = page.getByRole("link", { name: /log nap|ghi ngủ/i });
    const diaper = page.getByRole("link", { name: /log diaper|ghi tã/i });
    const growth = page.getByRole("link", { name: /log growth|ghi cân đo/i });

    // Dedicated path shapes (bottle / moon / diaper / growth).
    await expect(feed.locator("svg path").first()).toHaveAttribute(
      "d",
      /8 4h5a3/,
    );
    await expect(sleep.locator("svg path").first()).toHaveAttribute(
      "d",
      /14 5a7 7/,
    );
    await expect(diaper.locator("svg path").first()).toHaveAttribute(
      "d",
      /5 7h14v4/,
    );
    await expect(growth.locator("svg path").first()).toBeVisible();

    // Must not reuse Money bills / import / spending glyphs.
    for (const link of [feed, sleep, diaper, growth]) {
      const dJoined = await link.locator("svg path").evaluateAll((els) =>
        els.map((el) => el.getAttribute("d") ?? "").join("|"),
      );
      expect(dJoined).not.toMatch(/M6 2h12a2 2 0 0 1 2 2v16l-4-2/);
      expect(dJoined).not.toMatch(/M12 3v12m0 0 4-4/);
      expect(dJoined).not.toMatch(/M8 6h13M8 12h13M8 18h13/);
    }
  });
});

test.describe("Baby Care 3AM eye flow", () => {
  test("feed page: breast L/R + formula ml share Pump-style grid", async ({
    page,
  }) => {
    await page.goto("/baby/feed");
    const breastL = page.getByTestId("baby-feed-method-breast_l");
    const breastR = page.getByTestId("baby-feed-method-breast_r");
    const formulaGrid = page.locator('[data-layout="bottle-ml-chips"]').first();
    const row = page.getByTestId("baby-feed-timer-chips");

    await expect(
      breastL.getByText(/tap to start|chạm để bắt đầu/i),
    ).toBeVisible();
    await expect(page.getByTestId("baby-feed-method-pump_l")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /start timer|bắt đầu đếm/i }),
    ).toHaveCount(0);
    await expect(page.getByLabel(/amount \(ml|lượng/i)).toHaveCount(0);
    await expect(row).toBeVisible();
    await expect(breastR).toBeVisible();
    await expect(formulaGrid).toBeVisible();

    const chipBox = await breastL.boundingBox();
    const formulaBox = await formulaGrid.boundingBox();
    expect(chipBox).toBeTruthy();
    expect(formulaBox).toBeTruthy();
    expect(chipBox!.height).toBeGreaterThanOrEqual(56);
    // Same parent row as Pump: L left of (or above) formula chips.
    expect(
      chipBox!.x < formulaBox!.x || chipBox!.y < formulaBox!.y,
    ).toBeTruthy();
  });

  test("feed shows Home breast timer when already running", async ({
    page,
  }) => {
    const startedAt = Date.now() - 90_000;
    await page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: "baby.careTimer.v1",
        value: JSON.stringify({
          babyId: "home",
          breast: { side: "breast_l", startedAt },
          pump: null,
        }),
      },
    );
    await page.goto("/baby/feed");
    const breastL = page.getByTestId("baby-feed-method-breast_l");
    await expect(breastL).toHaveAttribute("data-running", "true");
    await expect(breastL.getByText(/1:\d{2}|2:\d{2}/)).toBeVisible();
    await expect(
      breastL.getByText(/tap to stop|chạm để dừng/i),
    ).toBeVisible();
  });

  test("sleep page: single TimedCareChip primary and large", async ({
    page,
  }) => {
    await page.goto("/baby/sleep");
    const chip = page.getByTestId(/baby-sleep-(start|end)/);
    await expect(chip).toBeVisible();
    await expect(
      chip.getByText(/tap to start|tap to stop|chạm để/i),
    ).toBeVisible();
    // One chip only — not dual Start+End buttons at once.
    await expect(page.getByTestId(/baby-sleep-(start|end)/)).toHaveCount(1);

    const box = await chip.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(56);

    // No optional field block below the chip (primary-only surface).
    await expect(page.getByLabel(/amount|duration|notes/i)).toHaveCount(0);
  });
});
