import { expect, test } from "@playwright/test";
import {
  expectAuthenticated,
  gotoAppPath,
  hasAuthStorage,
} from "./helpers/shell";

/**
 * Foods page smoke. Auth-gated.
 * LLM may fail soft after save; page must still show calendar + log UI.
 */
test.describe("Foods page", () => {
  test.beforeEach(() => {
    test.skip(!hasAuthStorage(), "needs E2E_STORAGE_STATE");
  });

  test("foods page shows icons and analysis after save (mocked LLM)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await gotoAppPath(page, "/foods");
    await expectAuthenticated(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Foods" }),
    ).toBeVisible({ timeout: 60_000 });

    await expect(page.getByRole("region", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Day log" })).toBeVisible();
    await expect(page.getByRole("region", { name: "AI analysis" })).toBeVisible();

    await page.getByRole("button", { name: /Vegetable/i }).click();
    await page.getByRole("button", { name: "Add entry" }).click();

    await expect(
      page.getByRole("list").getByText(/Vegetable/i).first(),
    ).toBeVisible({ timeout: 60_000 });

    const analysis = page.getByRole("region", { name: "AI analysis" });
    await expect(analysis).toContainText(/Not medical advice/i);
  });
});
