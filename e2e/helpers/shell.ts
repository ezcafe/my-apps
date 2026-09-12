import { expect, type Locator, type Page } from "@playwright/test";
import { hasAuthStorage } from "./auth";

export { hasAuthStorage };

/**
 * Open the shell hamburger (Money / Investments / Loans / Baby / …).
 * Retries when a heavy page remount resets the popover before the panel sticks.
 * Succeeds only when the open panel shows a section/app nav link.
 */
export async function openAppMenu(page: Page): Promise<void> {
  await waitForNextCompileIdle(page, 30_000);
  const trigger = page.getByRole("button", { name: /open .+ menu/i });
  const openPanel = page.locator('[data-floating-panel][data-open="true"]');
  // Any current-app or peer-app link proves the menu content mounted.
  const menuReadyLink = openPanel.getByRole("link").first();

  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    if ((await trigger.getAttribute("aria-expanded")) !== "true") {
      // DOM click: Playwright pointer click can fail to flip controlled open
      // on a busy Money ledger (layout shift / remount mid-gesture).
      await trigger.evaluate((el: HTMLButtonElement) => {
        el.click();
      });
    }
    try {
      await expect(trigger).toHaveAttribute("aria-expanded", "true", {
        timeout: 5_000,
      });
      await expect(openPanel).toBeVisible({ timeout: 5_000 });
      await expect(menuReadyLink).toBeVisible({ timeout: 5_000 });
      return;
    } catch (err) {
      lastError = err;
      if ((await trigger.getAttribute("aria-expanded")) === "true") {
        await trigger
          .evaluate((el: HTMLButtonElement) => {
            el.click();
          })
          .catch(() => {});
      }
      await waitForNextCompileIdle(page, 15_000);
    }
  }
  throw lastError ?? new Error("App menu did not stay open");
}

/** Open menu panel locator (after {@link openAppMenu}). */
export function appMenuPanel(page: Page): Locator {
  // Prefer first open panel — two MoneyAppMenu mounts must not strict-fail.
  return page.locator('[data-floating-panel][data-open="true"]').first();
}

const ABORT_NAV_RE =
  /ERR_ABORTED|frame was detached|Navigation interrupted|NS_BINDING_ABORTED|interrupted by another navigation/i;

/**
 * Next Dev Tools busy states (Compiling… / Rendering…) block soft-nav
 * and cold gotos. Wait them out before retry; do not throw on timeout.
 */
async function waitForNextCompileIdle(
  page: Page,
  timeoutMs = 60_000,
): Promise<void> {
  const tools = page.getByRole("button", { name: /Open Next\.js Dev Tools/i });
  try {
    await expect
      .poll(
        async () => {
          const visible = await tools.isVisible().catch(() => false);
          if (!visible) return "idle";
          const label = (await tools.innerText().catch(() => "")).replace(
            /\s+/g,
            " ",
          );
          return /Compiling|Rendering/i.test(label) ? "busy" : "idle";
        },
        { timeout: timeoutMs, intervals: [250, 500, 1_000] },
      )
      .toBe("idle");
  } catch {
    // Still busy when budget ends — caller may retry navigate/click.
  }
}

function pathMatches(pageUrl: string, path: string): boolean {
  try {
    const u = new URL(pageUrl);
    const norm = (p: string) => {
      const trimmed = p.replace(/\/+$/, "");
      return trimmed.length > 0 ? trimmed : "/";
    };
    return norm(u.pathname) === norm(path);
  } catch {
    return false;
  }
}

/**
 * Cold goto that survives Next compile / aborted navigations (common on
 * webpack `next dev` when the prior route is still compiling).
 * Uses domcontentloaded — full `load` often never settles while ATF skeletons
 * or Dev Tools stay busy. Cold compiles here routinely take 30–120s.
 */
export async function gotoAppPath(
  page: Page,
  path: string,
  attempts = 3,
): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      // Only wait for idle after a failed attempt — blank pages have no Dev Tools.
      if (i > 0) {
        await waitForNextCompileIdle(page, 90_000);
      }
      await page.goto(path, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      return;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Interrupted nav to the same path may still leave a usable page.
      if (pathMatches(page.url(), path)) {
        return;
      }
      // Retry aborts and compile-slow timeouts; fail fast on other errors.
      if (!ABORT_NAV_RE.test(msg) && !/Timeout/i.test(msg)) throw err;
    }
  }
  throw lastError;
}

/**
 * Soft-nav click + URL wait that does not require a full document `load`
 * (SPA transitions stall on `load` / `commit` while Next is compiling or
 * rendering a chunk). Short attempts + retries while Compiling/Rendering.
 */
export async function clickSoftNav(
  page: Page,
  link: Locator,
  url: string | RegExp,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    const slice = Math.min(60_000, Math.max(2_000, deadline - Date.now()));
    await waitForNextCompileIdle(page, slice);
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    try {
      await expect(page).toHaveURL(url, {
        timeout: Math.min(45_000, Math.max(5_000, deadline - Date.now())),
      });
      return;
    } catch (err) {
      lastError = err;
      await waitForNextCompileIdle(
        page,
        Math.min(60_000, Math.max(1_000, deadline - Date.now())),
      );
      try {
        await expect(page).toHaveURL(url, { timeout: 5_000 });
        return;
      } catch {
        // Retry click after compile/render settles.
      }
    }
  }
  throw lastError;
}

/**
 * Marker string for mutating e2e writes (Money notes, loan Pay notes).
 * Distinct across calls so soft trails do not collide.
 */
export function uniqueNote(prefix = "e2e"): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${stamp}-${rand}`;
}

/**
 * After goto with E2E_STORAGE_STATE set: hard-fail if redirected to login
 * (broken/expired cookie jar). Call only when hasAuthStorage() is true.
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(
    page,
    "E2E_STORAGE_STATE set but landed on /login — re-save the cookie jar",
  ).not.toHaveURL(/\/login/);
}

export type MoneyWorkspaceReadyOptions = {
  /**
   * Optional feature loading chrome (`aria-label`) that must disappear
   * after shell heading is up (e.g. settings chunk / import wizard).
   */
  loadingGone?: string | RegExp;
};

/**
 * Shared Money workspace bootstrap for Money / Investments / Loans.
 * Positive ready: bootstrap error absent + shell h1 visible.
 * Alert absence alone is not enough — on success that alert never mounts.
 */
export async function expectMoneyWorkspaceReady(
  page: Page,
  options?: MoneyWorkspaceReadyOptions,
): Promise<void> {
  await expectAuthenticated(page);
  await expect(
    page.getByRole("alert").filter({ hasText: /Couldn.?t load Money/i }),
    "Money bootstrap failed — check DB (pnpm docker:db) and GraphQL",
  ).toHaveCount(0, { timeout: 60_000 });
  await expect(
    page.getByRole("heading", { level: 1 }).first(),
    "Workspace shell heading not visible — still loading or auth failed",
  ).toBeVisible({ timeout: 60_000 });
  if (options?.loadingGone != null) {
    await expect(
      page.getByLabel(options.loadingGone),
      "Feature loading chrome still present",
    ).toHaveCount(0, { timeout: 60_000 });
  }
}

/**
 * Insights pages: wait until ATF/dashboard loading chrome is gone
 * (beyond Money bootstrap) before asserting More teasers.
 */
export async function expectInsightsAtfReady(page: Page): Promise<void> {
  await expect(
    page.getByRole("status", {
      name: /Loading (summary totals|analytics (page|charts)|insights)/i,
    }),
  ).toHaveCount(0, { timeout: 60_000 });
}
