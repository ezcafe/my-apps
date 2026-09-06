import { expect, test, type Page } from "@playwright/test";

/** Smoke: hamburger nav + home CTAs + EN/VI in settings. Writes need E2E_STORAGE_STATE. */

const hasAuthStorage = Boolean(process.env.E2E_STORAGE_STATE?.trim());

async function gotoBabyHome(page: Page) {
  await page.goto("/baby");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function openAppMenu(page: Page) {
  await page.getByRole("button", { name: /open .+ menu/i }).click();
}

/** Assert a status row left the empty chip (no wall-clock timestamp asserts). */
async function expectStatusRowNotEmpty(
  page: Page,
  label: RegExp,
  valueHint?: RegExp,
) {
  const status = page.getByTestId("baby-home-status");
  const row = status.locator("li").filter({ hasText: label });
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

  test("home shows last-care status above CTAs", async ({ page }) => {
    await gotoBabyHome(page);
    const status = page.getByTestId("baby-home-status");
    await expect(status).toBeVisible();
    await expect(
      status.getByRole("heading", { name: /last care|lần chăm gần nhất/i }),
    ).toBeVisible();
    await expect(status.getByText(/last feed|lần bú/i).first()).toBeVisible();
    await expect(status.getByText(/last nap|giấc ngủ/i).first()).toBeVisible();
    await expect(status.getByText(/last diaper|đổi tã/i).first()).toBeVisible();
    await expect(status.getByText(/how long since|đã bao lâu/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /log feed|ghi bú/i }),
    ).toBeVisible();
  });

  test("home status error keeps CTAs working", async ({ page }) => {
    // Force last-care timeline walk to fail; other baby GraphQL ops pass through.
    await page.route("**/api/graphql/baby", async (route) => {
      const body = route.request().postData() ?? "";
      if (/BabyTimeline|babyTimeline/.test(body)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            errors: [{ message: "e2e forced timeline error" }],
          }),
        });
        return;
      }
      await route.continue();
    });

    await gotoBabyHome(page);
    const status = page.getByTestId("baby-home-status");
    await expect(
      status
        .getByText(/could not load\. you can still log|không tải được\. bạn vẫn/i)
        .first(),
    ).toBeVisible();

    await page.getByRole("link", { name: /log feed|ghi bú/i }).click();
    await expect(page).toHaveURL(/\/baby\/feed/);
    await expect(
      page.getByRole("heading", { name: /log feed|ghi bú/i }),
    ).toBeVisible();
  });

  test("home Log feed CTA opens feed form", async ({ page }) => {
    await gotoBabyHome(page);
    await page.getByRole("link", { name: /log feed|ghi bú/i }).click();
    await expect(page).toHaveURL(/\/baby\/feed/);
    await expect(
      page.getByRole("heading", { name: /log feed|ghi bú/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /breast l|ngực trái/i }),
    ).toBeVisible();
  });

  test("home Log nap CTA opens sleep form", async ({ page }) => {
    await gotoBabyHome(page);
    await page.getByRole("link", { name: /log nap|ghi ngủ/i }).click();
    await expect(page).toHaveURL(/\/baby\/sleep/);
    await expect(
      page.getByRole("heading", { name: /sleep|giấc ngủ/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /start nap|bắt đầu ngủ/i }),
    ).toBeVisible();
  });

  test("home Log diaper CTA opens diaper form", async ({ page }) => {
    await gotoBabyHome(page);
    await page.getByRole("link", { name: /log diaper|ghi tã/i }).click();
    await expect(page).toHaveURL(/\/baby\/diaper/);
    await expect(
      page.getByRole("heading", { name: /log diaper|ghi tã/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /wet|ướt/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /dirty|bẩn/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /mixed|hỗn hợp/i }),
    ).toBeVisible();
  });

  test("insights page shows filters and growth then timeline", async ({
    page,
  }) => {
    await gotoBabyHome(page);
    await openAppMenu(page);
    await page.getByRole("link", { name: /^insights$|^thống kê$/i }).click();
    await expect(page).toHaveURL(/\/baby\/insights/);
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

    await expect(
      page.getByRole("heading", { name: /growth|cân đo/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /timeline|dòng thời gian/i }),
    ).toBeVisible();

    // View-only: no Measure editors on Insights (writes live on /baby/measure).
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

  test("insights shared chips apply to growth and timeline", async ({
    page,
  }) => {
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
      await route.continue();
    });

    await page.goto("/baby/insights");
    await expect(
      page.getByRole("heading", { name: /insights|thống kê/i }),
    ).toBeVisible();

    // Unfiltered: both care rows and both growth kinds visible.
    await expect(page.getByText("E2E feed event")).toBeVisible();
    await expect(page.getByText("E2E sleep event")).toBeVisible();
    await expect(page.getByText(/Weight 4\.2 kg/i)).toBeVisible();
    await expect(page.getByText(/Height 55 cm/i)).toBeVisible();

    // Care types live in filter bar (Accounts-style); growth kinds stay as chips.
    // Toolbar uses @container @md — wait for either desktop Care or mobile Filter.
    const careOrFilter = page.getByRole("button", {
      name: /^(care|chăm sóc|filter)\b/i,
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
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /^feed$|^bú$/i })
        .click();
      await page
        .getByLabel("Insights filters")
        .getByRole("button", { name: /^apply$|^áp dụng$/i })
        .click();
    }

    const kinds = page.getByRole("region", {
      name: /growth kinds|loại cân đo/i,
    });
    await kinds.getByRole("button", { name: /^weight$|^cân nặng$/i }).click();
    await kinds.getByRole("button", { name: /^apply$|^áp dụng$/i }).click();

    // Period chip reflects applied care + growth filters.
    const period = page.getByText(/^showing\b|^đang xem\b/i);
    await expect(period).toContainText(/Feed|Bú/i);
    await expect(period).toContainText(/Weight|Cân/i);

    // Timeline follows care filter; growth follows growth chips.
    await expect(page.getByText("E2E feed event")).toBeVisible();
    await expect(page.getByText("E2E sleep event")).toHaveCount(0);
    await expect(
      page.getByText(/Weight 4\.2 kg|Cân nặng 4\.2 kg/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Height 55 cm|Chiều cao 55 cm/i),
    ).toHaveCount(0);
  });

  test("old growth and timeline URLs redirect to insights", async ({
    page,
  }) => {
    await page.goto("/baby/growth");
    await expect(page).toHaveURL(/\/baby\/insights/);
    await page.goto("/baby/timeline");
    await expect(page).toHaveURL(/\/baby\/insights/);
  });

  test("measure page shows title and add form", async ({ page }) => {
    await gotoBabyHome(page);
    await page.getByRole("link", { name: /log measurement|ghi cân đo/i }).click();
    await expect(page).toHaveURL(/\/baby\/measure/);
    await expect(
      page.getByRole("heading", { name: /log measurement|ghi cân đo/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /add entry|thêm mục/i }),
    ).toBeVisible();
  });

  test("EN ↔ VI toggles from settings", async ({ page }) => {
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
    await expect(page.getByRole("link", { name: "Ghi bú" })).toBeVisible();

    await page.goto("/baby/settings");
    await expect(async () => {
      await page.getByRole("radio", { name: "English" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Settings" }),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass();

    await page.goto("/baby");
    await expect(page.getByRole("heading", { name: "Baby Care" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log feed" })).toBeVisible();
  });
});

test.describe("Baby Care capture navigate", () => {
  test.skip(!hasAuthStorage, "needs E2E_STORAGE_STATE for GraphQL writes");

  test("feed Start stays; method save lands on home", async ({ page }) => {
    await page.goto("/baby/feed");
    await page.getByRole("button", { name: /start timer|bắt đầu đếm/i }).click();
    await expect(page).toHaveURL(/\/baby\/feed/);
    await expect(
      page.getByRole("button", { name: /start timer|bắt đầu đếm/i }),
    ).toBeDisabled();
    await page.getByRole("button", { name: /breast l|ngực trái/i }).click();
    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(page.getByTestId("baby-home-status")).toBeVisible();
    await expectStatusRowNotEmpty(page, /last feed|lần bú/i);
  });

  test("diaper save lands on home", async ({ page }) => {
    await page.goto("/baby/diaper");
    await page.getByRole("button", { name: /wet|ướt/i }).click();
    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(page.getByTestId("baby-home-status")).toBeVisible();
    await expectStatusRowNotEmpty(page, /last diaper|đổi tã/i);
  });

  test("sleep Start stays; End lands on home", async ({ page }) => {
    const startBtn = page.getByRole("button", {
      name: /start nap|bắt đầu ngủ/i,
    });
    const endBtn = page.getByRole("button", {
      name: /end nap|kết thúc ngủ/i,
    });
    const sleepForm = page.getByTestId("baby-sleep-form");

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
      // Open-check starts pending (both disabled); wait until React clears it.
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
    if (await endBtn.isEnabled()) {
      await endBtn.click();
      await expect(page).toHaveURL(/\/baby\/?$/);
      await gotoSleepReady();
    }
    await expect(startBtn).toBeEnabled();

    await startBtn.click();
    await expect(page).toHaveURL(/\/baby\/sleep/);
    await expect(startBtn).toBeDisabled();
    await expect(endBtn).toBeEnabled();

    await endBtn.click();
    await expect(page).toHaveURL(/\/baby\/?$/);
    await expect(page.getByTestId("baby-home-status")).toBeVisible();
  });

  test("vaccine create shows in list", async ({ page }) => {
    await page.goto("/baby/vaccines");
    await expect(page.getByTestId("baby-vaccines-page")).toBeVisible();
    await page.getByLabel(/vaccine name|tên vắc-xin/i).fill("Hexaxim");
    await page.getByRole("radio", { name: /first|mũi 1/i }).click();
    await page.getByRole("button", { name: /log vaccine|ghi vắc-xin/i }).click();
    await expect(page.getByTestId("baby-vaccine-row").first()).toContainText(
      /Hexaxim/i,
    );
  });

  test("measure chips visible; save lands on home", async ({ page }) => {
    await page.goto("/baby/measure");
    await expect(page.getByTestId("baby-measure-kind-chips")).toBeVisible();
    await page.getByRole("radio", { name: /weight|cân/i }).click();
    await page.locator('input[type="number"]').fill("4.1");
    await page.getByRole("button", { name: /add entry|thêm mục/i }).click();
    await expect(page).toHaveURL(/\/baby\/?$/);
  });
});

test.describe("Baby Care insights charts", () => {
  test("Insights shows chart region, care-count, and growth chart cards", async ({
    page,
  }) => {
    // Mock like timeline Breast L/R: unauthenticated GraphQL would UNAUTHORIZED
    // and hide the charts grid (growthSection === "error").
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
              babyTimeline: { items: [], nextCursor: null },
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
            data: { babyGrowthEntries: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/baby/insights");
    await expect(page.getByTestId("baby-insights-charts")).toBeVisible({
      timeout: 15_000,
    });
    // Care-count card always mounts (empty or with series legend).
    await expect(page.getByTestId("baby-care-count-chart")).toBeVisible();
    // Empty growth chips → all kinds; cards mount even with no points.
    await expect(page.getByTestId("baby-growth-chart-card").first()).toBeVisible();
  });

  test("insights timeline shows Breast L/R, stop time, and compact duration", async ({
    page,
  }) => {
    // Mock care rows so labels/duration/stop clock are deterministic.
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
                    id: "e2e-breast-l",
                    kind: "care",
                    type: "feed",
                    at: "2026-09-05T10:12:00.000Z",
                    endedAt: null,
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
                    summary: "Ended sleep · 1h 5m",
                    source: "web",
                    cursor: "c3",
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
            data: { babyGrowthEntries: { items: [], nextCursor: null } },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/baby/insights");
    await expect(
      page.getByRole("heading", { name: /timeline|dòng thời gian/i }),
    ).toBeVisible();

    // Label strips trailing duration; duration + stop clock sit beside it.
    await expect(page.getByText("Feed (Breast L)", { exact: true })).toBeVisible();
    await expect(page.getByText("Feed (Breast R)", { exact: true })).toBeVisible();
    await expect(page.getByText("12m", { exact: true })).toBeVisible();
    await expect(page.getByText("1h 5m", { exact: true }).first()).toBeVisible();
    // Use dateTime so locale clock text does not flake.
    await expect(
      page.locator('time[datetime="2026-09-05T10:12:00.000Z"]'),
    ).toBeVisible();
    await expect(
      page.locator('time[datetime="2026-09-05T12:05:00.000Z"]'),
    ).toBeVisible();
    // Closed sleep stop = endedAt.
    await expect(
      page.locator('time[datetime="2026-09-05T09:05:00.000Z"]'),
    ).toBeVisible();
  });

  test("hamburger includes Vaccines", async ({ page }) => {
    await page.goto("/baby/settings");
    await openAppMenu(page);
    await expect(
      page.getByRole("link", { name: /vaccines|vắc-xin/i }),
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
    const vaccine = page.getByRole("link", { name: /vaccines|vắc-xin/i });

    // Dedicated path shapes (bottle / moon / diaper / syringe).
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
    await expect(vaccine.locator("svg path").first()).toHaveAttribute(
      "d",
      /m9 3 2 2/,
    );

    // Must not reuse Money bills / import / spending glyphs.
    for (const link of [feed, sleep, diaper, vaccine]) {
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
  test("feed page: timer + methods above optional amount/duration", async ({
    page,
  }) => {
    await page.goto("/baby/feed");
    const start = page.getByRole("button", { name: /start timer|bắt đầu đếm/i });
    const breastL = page.getByRole("button", { name: /breast l|ngực trái/i });
    const amount = page.getByLabel(/amount \(ml|lượng/i);

    await expect(start).toBeVisible();
    const startBox = await start.boundingBox();
    const methodBox = await breastL.boundingBox();
    const amountBox = await amount.boundingBox();
    expect(startBox).toBeTruthy();
    expect(methodBox).toBeTruthy();
    expect(amountBox).toBeTruthy();

    // Top → bottom: Start, then method chips, then optional fields.
    expect(startBox!.y).toBeLessThan(methodBox!.y);
    expect(methodBox!.y).toBeLessThan(amountBox!.y);
    // Large night targets (min-h-14 ≈ 56px).
    expect(startBox!.height).toBeGreaterThanOrEqual(56);
    expect(methodBox!.height).toBeGreaterThanOrEqual(56);
  });

  test("sleep page: Start/End primary row first and large", async ({ page }) => {
    await page.goto("/baby/sleep");
    const start = page.getByRole("button", { name: /start nap|bắt đầu ngủ/i });
    const end = page.getByRole("button", { name: /end nap|kết thúc ngủ/i });

    await expect(start).toBeVisible();
    const startBox = await start.boundingBox();
    const endBox = await end.boundingBox();
    expect(startBox).toBeTruthy();
    expect(endBox).toBeTruthy();

    // Same primary row (side-by-side or stacked); Start is first in reading order.
    expect(startBox!.y).toBeLessThanOrEqual(endBox!.y + 8);
    if (Math.abs(startBox!.y - endBox!.y) < 8) {
      expect(startBox!.x).toBeLessThan(endBox!.x);
    }
    expect(startBox!.height).toBeGreaterThanOrEqual(56);
    expect(endBox!.height).toBeGreaterThanOrEqual(56);

    // No optional field block below Start/End on sleep (primary-only surface).
    await expect(page.getByLabel(/amount|duration|notes/i)).toHaveCount(0);
  });
});
