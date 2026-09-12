import { expect, test } from "@playwright/test";
import {
  appMenuPanel,
  clickSoftNav,
  expectInsightsAtfReady,
  expectMoneyWorkspaceReady,
  gotoAppPath,
  hasAuthStorage,
  openAppMenu,
  uniqueNote,
} from "./helpers/shell";

/**
 * Money Depth C smoke + write.
 * Needs E2E_STORAGE_STATE (auth-gated). Skip without storage.
 * Mutating runs: disposable local workspace only.
 */

const MONEY_MORE_TITLES = [
  "Budget vs actual",
  "Top merchants",
  "Recurring spend",
] as const;

const SETTINGS_CHILDREN = [
  { path: "/money/settings/accounts", title: "Accounts" },
  { path: "/money/settings/categories", title: "Categories" },
  { path: "/money/settings/recurrence", title: "Recurrence" },
  { path: "/money/settings/budgets", title: "Budgets" },
  { path: "/money/settings/rules", title: "Rules" },
  { path: "/money/settings/merchants", title: "Merchants" },
  { path: "/money/settings/tags", title: "Tags" },
] as const;

test.describe("Money e2e", () => {
  test.skip(
    !hasAuthStorage(),
    "needs E2E_STORAGE_STATE — Money routes redirect to /login without a session",
  );

  test("home shows Spending heading", async ({ page }) => {
    test.setTimeout(180_000);
    await gotoAppPath(page, "/money");
    await expectMoneyWorkspaceReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Spending" }),
    ).toBeVisible();
    // Wait for ledger chrome so the hamburger is not clicked mid-shift.
    await expect(
      page.getByRole("status", { name: /Loading transactions/i }),
    ).toHaveCount(0, { timeout: 60_000 });

    // On Money, current-app sections show; Other apps lists peer apps.
    // Re-open if a remount collapses the panel before links assert.
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      await openAppMenu(page);
      const menu = appMenuPanel(page);
      try {
        await expect(
          menu.getByRole("link", { name: /^Spending$/i }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
          menu.getByRole("link", { name: /^Investments$/i }),
        ).toBeVisible({ timeout: 10_000 });
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  });

  test("add transaction with unique note", async ({ page }) => {
    test.setTimeout(180_000);
    await gotoAppPath(page, "/money/new");
    await expectMoneyWorkspaceReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Add transaction" }),
    ).toBeVisible();
    // Wait out the dynamic() skeleton + lookup bootstrap so Save is live.
    await expect(
      page.getByLabel("Loading money dashboard"),
    ).toHaveCount(0, { timeout: 60_000 });
    await expect(
      page.getByRole("textbox", { name: "Amount" }),
    ).toBeEnabled({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: "Save transaction" }),
    ).toBeEnabled({ timeout: 60_000 });

    await page.getByRole("textbox", { name: "Amount" }).fill("1");
    await page
      .getByRole("radiogroup", { name: "Transaction type" })
      .getByRole("radio", { name: "Expense" })
      .click();
    // Notes is always visible; extras toggle still expands merchant/tags.
    await page.getByRole("button", { name: "Notes & extras" }).click();
    const note = uniqueNote("money");
    await page.getByLabel("Notes").fill(note);
    await page.getByRole("button", { name: "Save transaction" }).click();

    // Short timeout: if error alert is present, fail soft fast (not 15s).
    await expect
      .soft(
        page
          .getByRole("alert")
          .filter({ hasText: /Couldn.?t save/i }),
      )
      .toHaveCount(0, { timeout: 2_000 });
    await expect
      .soft(page.getByRole("status").filter({ hasText: "Transaction added" }))
      .toBeVisible();
  });

  test("insights More teasers expand", async ({ page }) => {
    // Cold Insights often compiles 30–90s under webpack; avoid waitUntil `load`.
    test.setTimeout(240_000);
    await gotoAppPath(page, "/money/insights");
    await expectMoneyWorkspaceReady(page);
    await expectInsightsAtfReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Insights" }),
    ).toBeVisible();

    // Wait for hydrated teasers (client mount) so click handlers are live.
    const teasersRoot = page.locator("[data-insights-more-teasers]");
    await expect(teasersRoot).toBeVisible({ timeout: 60_000 });

    // Design: Money More missing → soft (thin seed). Short soft budget so
    // three missing teasers do not burn 3×15s before expand/continue.
    const moreSoftMs = 2_000;
    const moreExpandMs = 45_000;
    for (const title of MONEY_MORE_TITLES) {
      await expect
        .soft(teasersRoot.getByRole("button", { name: new RegExp(title, "i") }))
        .toBeVisible({ timeout: moreSoftMs });
    }

    const firstTeaser = teasersRoot.getByRole("button", {
      name: new RegExp(MONEY_MORE_TITLES[0], "i"),
    });
    if (await firstTeaser.isVisible()) {
      // No force: need a real actionable click on the hydrated button.
      await firstTeaser.click({ timeout: 30_000 });
      await expect(page).toHaveURL(/[?&]more=1(?:&|$)/, {
        timeout: moreExpandMs,
      });
      await expect(
        page.getByRole("heading", { name: MONEY_MORE_TITLES[0] }),
      ).toBeVisible({ timeout: moreExpandMs });
    }
  });

  // Task 6 Settings B: one cold hub load, then each child via hub link
  // (not deep-link only). Soft-nav back via breadcrumb cuts per-child
  // cold boots. Extra budget for webpack compile/render stalls.
  test("settings hub and every child from hub", async ({ page }) => {
    test.setTimeout(480_000);

    async function assertSettingsHub(): Promise<void> {
      await expectMoneyWorkspaceReady(page, {
        loadingGone: /Loading settings content/i,
      });
      await expect(
        page.getByRole("heading", { level: 1, name: "Money settings" }),
      ).toBeVisible();
    }

    await gotoAppPath(page, "/money/settings");
    await assertSettingsHub();

    for (let i = 0; i < SETTINGS_CHILDREN.length; i++) {
      const { path, title } = SETTINGS_CHILDREN[i];
      const hubLink = page
        .getByRole("list", { name: "Ledger and automation" })
        .getByRole("link", { name: title, exact: true });
      // Soft-nav under webpack compile: waitUntil commit + retry (not load).
      await clickSoftNav(
        page,
        hubLink,
        new RegExp(`${path.replace(/\//g, "\\/")}(?:\\?.*)?$`),
        120_000,
      );
      await expectMoneyWorkspaceReady(page);
      await expect(
        page.getByRole("heading", { level: 1, name: title }),
      ).toBeVisible();

      if (i < SETTINGS_CHILDREN.length - 1) {
        const settingsCrumb = page
          .getByRole("navigation", { name: "Breadcrumb" })
          .getByRole("link", { name: "Settings" });
        await clickSoftNav(
          page,
          settingsCrumb,
          /\/money\/settings\/?(?:\?.*)?$/,
          120_000,
        );
        await assertSettingsHub();
      }
    }
  });

  test("import entry shows Import data", async ({ page }) => {
    // Retry on ERR_ABORTED; cold import compile can exceed 2 minutes.
    test.setTimeout(240_000);
    await gotoAppPath(page, "/money/import");
    await expectMoneyWorkspaceReady(page, {
      loadingGone: /Loading import wizard/i,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Import data" }),
    ).toBeVisible();
  });
});
