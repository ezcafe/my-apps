import { expect, test } from "@playwright/test";
import {
  expectInsightsAtfReady,
  expectMoneyWorkspaceReady,
  hasAuthStorage,
  openAppMenu,
} from "./helpers/shell";

/**
 * Investments smoke (home, Insights More, import/settings, open new form).
 * Needs E2E_STORAGE_STATE. Insights More requires non-empty ATF seed
 * (empty Insights has no More teaser buttons → hard fail).
 * Write-B exception: open /investments/new only — do not submit.
 */

const INVESTMENTS_MORE_TITLES = [
  "Realized vs unrealized",
  "P&L by symbol",
  "Risk metrics",
] as const;

test.describe("Investments e2e", () => {
  test.skip(
    !hasAuthStorage(),
    "needs E2E_STORAGE_STATE — Investments routes redirect to /login without a session",
  );

  test("home shows Investments heading", async ({ page }) => {
    await page.goto("/investments");
    await expectMoneyWorkspaceReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Investments" }),
    ).toBeVisible();

    await openAppMenu(page);
    await expect(
      page.getByRole("link", { name: /^Investments$/i }).first(),
    ).toBeVisible();
  });

  test("insights More teasers expand", async ({ page }) => {
    await page.goto("/investments/insights");
    await expectMoneyWorkspaceReady(page);
    await expectInsightsAtfReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Insights" }),
    ).toBeVisible();

    // Seed must be non-empty ATF so More teasers render (hard-fail if empty).
    // Button accessible name includes hint text — match title substring.
    for (const title of INVESTMENTS_MORE_TITLES) {
      await expect(
        page.getByRole("button", { name: new RegExp(title, "i") }),
        "Investments Insights empty — seed instruments/activity so More teasers appear",
      ).toBeVisible();
    }

    await page
      .getByRole("button", {
        name: new RegExp(INVESTMENTS_MORE_TITLES[0], "i"),
      })
      .click();
    await expect
      .soft(
        page.getByRole("heading", { name: INVESTMENTS_MORE_TITLES[0] }),
      )
      .toBeVisible();
  });

  test("import entry shows Import statement", async ({ page }) => {
    await page.goto("/investments/import");
    await expectMoneyWorkspaceReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Import statement" }),
    ).toBeVisible();
  });

  test("settings entry shows Investments settings", async ({ page }) => {
    await page.goto("/investments/settings");
    await expectMoneyWorkspaceReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Investments settings" }),
    ).toBeVisible();
  });

  test("new form opens without submit", async ({ page }) => {
    await page.goto("/investments/new");
    await expectMoneyWorkspaceReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Record activity" }),
    ).toBeVisible();
    // Write-B exception: do not submit investment activity in v1.
  });
});
