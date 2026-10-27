import { expect, test } from "@playwright/test";
import {
  expectMoneyWorkspaceReady,
  gotoAppPath,
  hasAuthStorage,
} from "./helpers/shell";

/**
 * Grill Q1 structural bar for investments ledger + loan installments paging.
 * Needs E2E_STORAGE_STATE.
 */

test.describe("Investments + loans list perf e2e", () => {
  test.describe.configure({ timeout: 180_000 });

  test.skip(
    !hasAuthStorage(),
    "needs E2E_STORAGE_STATE — routes redirect to /login without a session",
  );

  test("investments ledger rows without waiting on deferred summary", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await gotoAppPath(page, "/investments");
    await expectMoneyWorkspaceReady(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Investments" }),
    ).toBeVisible();
    // Structural bar: ledger table/empty ready; do not wait on deferred summary KPIs.
    await expect(
      page.getByRole("status", { name: /Loading transactions/i }),
    ).toHaveCount(0, { timeout: 60_000 });
    const table = page.getByRole("table").last();
    const emptyHeading = page.getByRole("heading", {
      name: /No investment account activity/i,
    });
    await expect(table.or(emptyHeading).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("loan detail page-1 schedule + Next when paging", async ({ page }) => {
    test.setTimeout(180_000);
    await gotoAppPath(page, "/loans");
    await expectMoneyWorkspaceReady(page);

    // Match loans.spec.ts: skip /loans/new|insights|settings (href^="/loans/" alone hits Create).
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
    test.skip(!opened, "needs at least one loan in the e2e workspace");
    await expect(
      page.getByRole("heading", { name: /Payment schedule/i }),
    ).toBeVisible({ timeout: 60_000 });

    const scheduleTable = page
      .getByRole("table")
      .filter({ has: page.getByRole("columnheader", { name: "#" }) });
    const emptySchedule = page.getByRole("heading", {
      name: /No (upcoming payments|paid installments|installments on this loan)/i,
    });
    await expect(scheduleTable.or(emptySchedule).first()).toBeVisible({
      timeout: 30_000,
    });

    const nextBtn = page.getByRole("button", { name: /^Next$/i });
    if ((await nextBtn.count()) > 0) {
      await nextBtn.click();
      await expect(scheduleTable.or(emptySchedule).first()).toBeVisible({
        timeout: 30_000,
      });
    }
  });
});
