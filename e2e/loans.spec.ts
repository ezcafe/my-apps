import { expect, test, type Page } from "@playwright/test";
import {
  expectInsightsAtfReady,
  expectMoneyWorkspaceReady,
  hasAuthStorage,
  openAppMenu,
  uniqueNote,
} from "./helpers/shell";

/**
 * Loans smoke + Pay submit.
 * Needs E2E_STORAGE_STATE. Insights More needs non-empty ATF (usually follows
 * an active loan / Pay seed). Pay requires a payable installment — hard fail
 * if no list Pay / detail Add payment control.
 * Mutating runs: disposable local workspace only.
 */

const LOANS_MORE_TITLES = [
  "Combined payoff progress",
  "Collateral LTV",
  "Per-loan payoff",
] as const;

async function openPayFlow(page: Page): Promise<void> {
  await page.goto("/loans");
  await expectMoneyWorkspaceReady(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Loans" }),
  ).toBeVisible();

  // Wait for list/skeleton to finish (status "Loading loans").
  await expect(page.getByRole("status", { name: /Loading loans/i })).toHaveCount(
    0,
    { timeout: 60_000 },
  );

  // Task 10: prefer list/table Pay — not LoansDueBanner compact Pay.
  // Desktop table is visible under Chromium; CSS-hidden twin ignored via visible.
  const listPay = page
    .getByRole("table")
    .getByRole("button", { name: /^Pay$/ })
    .filter({ visible: true });
  if ((await listPay.count()) > 0) {
    await listPay.first().click();
    return;
  }

  // Fallback: open first visible loan detail and use full Pay label.
  // Desktop table + mobile list both mount links; click must use visible only.
  let opened = false;
  const links = page.locator('a[href^="/loans/"]').filter({ visible: true });
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    const href = (await links.nth(i).getAttribute("href")) ?? "";
    const id = href.match(/^\/loans\/([^/]+)\/?$/)?.[1];
    if (!id || id === "new" || id === "insights" || id === "settings") {
      continue;
    }
    await links.nth(i).click();
    opened = true;
    break;
  }
  expect(
    opened,
    "No list Pay and no loan detail link — seed an active loan with a payable installment",
  ).toBeTruthy();

  const detailPay = page.getByRole("button", {
    name: "Add payment to Money",
  });
  await expect(
    detailPay,
    "No Pay on list and no Add payment to Money on detail — seed a payable installment",
  ).toBeVisible();
  await detailPay.click();
}

test.describe("Loans e2e", () => {
  test.skip(
    !hasAuthStorage(),
    "needs E2E_STORAGE_STATE — Loans routes redirect to /login without a session",
  );

  test("home shows Loans heading", async ({ page }) => {
    await page.goto("/loans");
    await expectMoneyWorkspaceReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Loans" }),
    ).toBeVisible();

    await openAppMenu(page);
    await expect(
      page.getByRole("link", { name: /^Loans$/i }).first(),
    ).toBeVisible();
  });

  test("insights More teasers expand", async ({ page }) => {
    await page.goto("/loans/insights");
    await expectMoneyWorkspaceReady(page);
    await expectInsightsAtfReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Insights" }),
    ).toBeVisible();

    // Button accessible name includes hint text — match title substring.
    for (const title of LOANS_MORE_TITLES) {
      await expect(
        page.getByRole("button", { name: new RegExp(title, "i") }),
        "Loans Insights empty — seed an active loan so More teasers appear",
      ).toBeVisible();
    }

    await page
      .getByRole("button", { name: new RegExp(LOANS_MORE_TITLES[0], "i") })
      .click();
    // Expanded cards use matching / nearby landmarks (not all teaser titles are h2).
    await expect
      .soft(page.getByRole("heading", { name: "Combined payoff progress" }))
      .toBeVisible();
  });

  test("settings entry shows Loans settings", async ({ page }) => {
    await page.goto("/loans/settings");
    await expectMoneyWorkspaceReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Loans settings" }),
    ).toBeVisible();
  });

  test("Pay records payment with unique note", async ({ page }) => {
    await openPayFlow(page);

    // Named dialog: ignore any nested/closed floating panels that share role=dialog.
    const dialog = page.getByRole("dialog", { name: "Add payment to Money" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    const note = uniqueNote("loan-pay");
    await dialog.getByLabel("Notes").fill(note);
    await dialog.getByRole("button", { name: "Record payment" }).click();

    // Short timeout: if error alert is present, fail soft fast (not 15s).
    await expect
      .soft(
        page
          .getByRole("alert")
          .filter({ hasText: /Payment failed|Couldn.?t save/i }),
      )
      .toHaveCount(0, { timeout: 2_000 });
    await expect
      .soft(
        page
          .getByRole("status")
          .filter({ hasText: "Payment recorded in Money" }),
      )
      .toBeVisible();
  });
});
