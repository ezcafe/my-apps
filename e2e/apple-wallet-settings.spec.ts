import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  expectAuthenticated,
  gotoAppPath,
  hasAuthStorage,
} from "./helpers/shell";

/**
 * Shell `/settings` Apple Wallet category.
 * Auth-gated — skip without E2E_STORAGE_STATE (same as money/loans).
 *
 * Apple on/off is server env (`APPLE_*` + HTTPS BASE_URL). There is no
 * appleEnabled mock hook in this repo; on-path tests skip when the gate is off.
 * Real APNs / lock-screen stay manual (see 06-test-log).
 */

const APPLE_OFF_BLOCKED =
  "blocked: Apple Wallet disabled on e2e webServer (need APPLE_* + HTTPS BASE_URL); no appleEnabled mock hook";

const SETUP_GUIDE_HREF = "/help#apple-wallet";

async function openAppleWalletSection(page: Page): Promise<Locator> {
  test.setTimeout(180_000);
  await gotoAppPath(page, "/settings#settings-apple-wallet");
  await expectAuthenticated(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Settings" }),
  ).toBeVisible({ timeout: 60_000 });

  const section = page.locator("section#settings-apple-wallet");
  if (!(await section.isVisible().catch(() => false))) {
    const nav = page
      .getByRole("navigation", { name: /Settings (categories|navigation)/i })
      .first();
    await nav.getByRole("button", { name: /^Apple Wallet$/i }).click();
  }
  await expect(section).toBeVisible({ timeout: 30_000 });
  await expect(
    section.getByRole("heading", { level: 2, name: "Apple Wallet" }),
  ).toBeVisible();
  return section;
}

async function appleEnabledInSection(section: Locator): Promise<boolean> {
  return section
    .getByRole("button", { name: "Add to Apple Wallet" })
    .isVisible()
    .catch(() => false);
}

test.describe("Apple Wallet settings", () => {
  test.skip(
    !hasAuthStorage(),
    "needs E2E_STORAGE_STATE — /settings redirects to /login without a session",
  );

  test("Apple off: readiness copy + setup link; no secrets in DOM", async ({
    page,
  }) => {
    const section = await openAppleWalletSection(page);
    if (await appleEnabledInSection(section)) {
      test.skip(
        true,
        "Apple enabled in this env — off-gate asserts when APPLE_* unset",
      );
    }

    const readiness = section.getByTestId("apple-wallet-readiness");
    await expect(readiness).toBeVisible();
    await expect(readiness).toContainText(
      /Public URL must use HTTPS|PassKit certificates missing on server/i,
    );
    await expect(
      section.getByRole("link", { name: "Apple Wallet setup guide" }),
    ).toHaveAttribute("href", SETUP_GUIDE_HREF);

    await expect(
      section.getByRole("button", { name: "Add to Apple Wallet" }),
    ).toHaveCount(0);
    await expect(section.getByRole("button", { name: "Show QR" })).toHaveCount(
      0,
    );
    await expect(section.getByTestId("apple-wallet-status")).toHaveCount(0);

    const bodyText = await section.innerText();
    expect(bodyText).not.toMatch(/APPLE_SIGNER/);
    expect(bodyText).not.toMatch(/BEGIN CERTIFICATE/);
  });

  test("Apple on + healthy: Add visible", async ({ page }) => {
    const section = await openAppleWalletSection(page);
    if (!(await appleEnabledInSection(section))) {
      test.skip(true, APPLE_OFF_BLOCKED);
    }

    const add = section.getByRole("button", { name: "Add to Apple Wallet" });
    const status = section.getByTestId("apple-wallet-status");
    const qrSummary = section.getByText("Scan from another device");

    await expect(add).toBeVisible();
    await expect(status).toBeVisible();
    await expect(status).toContainText(/^Status:/);
    await expect(qrSummary).toBeVisible();

    // DOM order: readiness → Add → status → QR details.
    const order = await section.evaluate((root) => {
      const readinessEl = root.querySelector(
        '[data-testid="apple-wallet-readiness"]',
      );
      const addEl = root.querySelector('button[type="submit"]');
      const statusEl = root.querySelector('[data-testid="apple-wallet-status"]');
      const detailsEl = root.querySelector("details");
      if (!readinessEl || !addEl || !statusEl || !detailsEl) return null;
      return {
        readinessBeforeAdd: Boolean(
          readinessEl.compareDocumentPosition(addEl) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        addBeforeStatus: Boolean(
          addEl.compareDocumentPosition(statusEl) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        statusBeforeQr: Boolean(
          statusEl.compareDocumentPosition(detailsEl) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      };
    });
    expect(order?.readinessBeforeAdd).toBe(true);
    expect(order?.addBeforeStatus).toBe(true);
    expect(order?.statusBeforeQr).toBe(true);

    await qrSummary.click();
    await expect(section.getByRole("button", { name: "Show QR" })).toBeVisible();
  });

  test("After Add: optimistic pending without real APNs", async ({ page }) => {
    const section = await openAppleWalletSection(page);
    if (!(await appleEnabledInSection(section))) {
      test.skip(true, APPLE_OFF_BLOCKED);
    }

    // Keep the page on Settings: stop navigational .pkpass GET so we can
    // assert client optimistic pending (no real PassKit / APNs).
    await page.evaluate(() => {
      const form = document.querySelector(
        'section#settings-apple-wallet form[action="/api/apple-wallet/issue"]',
      );
      form?.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
        },
        { capture: true },
      );
    });

    await section.getByRole("button", { name: "Add to Apple Wallet" }).click();
    await expect(section.getByTestId("apple-wallet-status")).toContainText(
      /Pending/i,
    );
  });

  test("Unlink and delete-pass guidance when linked", async ({ page }) => {
    const section = await openAppleWalletSection(page);
    if (!(await appleEnabledInSection(section))) {
      test.skip(true, APPLE_OFF_BLOCKED);
    }

    const unlink = section.getByRole("button", {
      name: "Unlink Apple Wallet",
    });
    const alreadyLinked = await unlink.isVisible().catch(() => false);

    if (!alreadyLinked) {
      await page.evaluate(() => {
        const form = document.querySelector(
          'section#settings-apple-wallet form[action="/api/apple-wallet/issue"]',
        );
        form?.addEventListener(
          "submit",
          (event) => {
            event.preventDefault();
          },
          { capture: true },
        );
      });
      await section.getByRole("button", { name: "Add to Apple Wallet" }).click();
      await expect(section.getByTestId("apple-wallet-status")).toContainText(
        /Pending/i,
      );
    }

    await expect(unlink).toBeVisible();
    await expect(
      section.getByText(
        /Also delete the pass in the Wallet app on your iPhone/i,
      ),
    ).toBeVisible();
  });
});
