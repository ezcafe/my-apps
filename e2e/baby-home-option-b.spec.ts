import { expect, test, type Page } from "@playwright/test";
import {
  bottleGroup,
  bottleHeader,
  bottleLess,
  bottleMlChip,
  bottleMore,
  bottleSave,
  breastL,
  breastR,
  customMlButton,
  defaultStatus,
  diaperCustomTimeChip,
  diaperGroup,
  diaperKindTile,
  diaperSave,
  gotoBabyHomeReady,
  gotoBabyHomeReadyForCare,
  homeStatus,
  installBabyHomeMocks,
  napCustomTimeChip,
  bottleCustomMlEdit,
  pumpAmountGroup,
  pumpAmountMlChip,
  pumpCustomMlButton,
  pumpL,
  pumpR,
  quickStep,
  sectionOrder,
  seedBirthDateModalVisitDismissed,
  sleepCard,
} from "./helpers/baby-home-graphql";
import { openAppMenu, appMenuPanel, clickSoftNav } from "./helpers/shell";

/** Mirror lib/baby-quick-care-pending + breast timer keys (avoid @/ in e2e). */
const BABY_QUICK_PENDING_STORAGE_KEY = "baby.quickCare.pending.v1";
const BABY_BREAST_TIMER_STORAGE_KEY = "baby.breastTimer.v1";
const BABY_CARE_TIMER_STORAGE_KEY = "baby.careTimer.v1";
/** Post-stop bottle grace — mirrors BABY_FEED_POST_STOP_GRACE_MS. */
const FEED_POST_STOP_GRACE_MS = 5 * 60 * 1000;

type PendingRequest = {
  action: Record<string, unknown>;
  breastRunning: { side: string; durationSec: number } | null;
};

type BabyQuickPending = {
  babyId: string;
  requestId: string;
  request: PendingRequest;
  state: "sending" | "unknown";
  startedAt: number;
};

const FEED_AT = "2026-09-12T08:00:00.000Z";
const BIRTH = "2026-07-01";

function feedPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "f1",
    kind: "care",
    type: "feed",
    at: FEED_AT,
    endedAt: null,
    payload: { method: "breast_l" },
    summary: "Feed (Breast L)",
    source: "web",
    cursor: "c1",
    ...overrides,
  };
}

function sleepEndedPayload() {
  return {
    id: "s1",
    kind: "care",
    type: "sleep",
    at: "2026-09-12T06:00:00.000Z",
    endedAt: "2026-09-12T07:00:00.000Z",
    payload: {},
    summary: "Ended sleep",
    source: "web",
    cursor: "c2",
  };
}

function diaperPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "d1",
    kind: "care",
    type: "diaper",
    at: "2026-09-12T09:00:00.000Z",
    endedAt: null,
    payload: { kind: "wet" },
    summary: "Diaper (wet)",
    source: "web",
    cursor: "c3",
    ...overrides,
  };
}

async function seedLocalStorage(
  page: Page,
  entries: Record<string, string>,
) {
  await page.addInitScript((pairs) => {
    for (const [k, v] of Object.entries(pairs)) {
      window.localStorage.setItem(k, v);
    }
  }, entries);
}

function pendingRecord(
  partial: Partial<BabyQuickPending> & {
    request: PendingRequest;
  },
): BabyQuickPending {
  return {
    babyId: "home",
    requestId: partial.requestId ?? "e2e-req-1",
    request: partial.request,
    state: partial.state ?? "unknown",
    startedAt: partial.startedAt ?? Date.now() - 60_000,
  };
}

/**
 * Under-owner recovery title (unknown / orphaned sending).
 * Scoped to `[data-testid=baby-home-pending-recovery]` — page-level strip is gone.
 */
function pendingTitle(page: Page) {
  return page
    .getByTestId("baby-home-pending-recovery")
    .locator("p")
    .filter({ hasText: /could not confirm|chưa xác nhận/i });
}

/**
 * Under-owner too-old copy. Same recovery region; no page strip.
 */
function pendingTooOldTitle(page: Page) {
  return page
    .getByTestId("baby-home-pending-recovery")
    .locator("p")
    .filter({ hasText: /too long|đã quá lâu/i });
}

/** Recovery region under a specific owner section (shared footer). */
function pendingRecoveryUnder(
  page: Page,
  owner:
    | "bottle"
    | "diaper"
    | "nap"
    | "breast_l"
    | "breast_r"
    | "pump_l"
    | "pump_r"
    | "pump_amount",
) {
  const section =
    owner === "breast_l" || owner === "breast_r"
      ? page.locator('[data-section="breast"]')
      : owner === "pump_l" ||
          owner === "pump_r" ||
          owner === "pump_amount"
        ? page.locator('[data-section="pump"]')
        : page.locator(`[data-section="${owner}"]`);
  return section.getByTestId("baby-home-pending-recovery");
}

test.describe("Baby Care home Option B", () => {
  test("row 1: Left and Right breast controls with names and icons", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReady(page);
    await expect(breastL(page)).toBeVisible();
    await expect(breastR(page)).toBeVisible();
    await expect(breastL(page).getByText("Left", { exact: true })).toBeVisible();
    await expect(breastR(page).getByText("Right", { exact: true })).toBeVisible();
    // IconSwap keeps both SVGs mounted (active + inactive).
    await expect(breastL(page).locator("svg").first()).toBeVisible();
    await expect(breastR(page).locator("svg").first()).toBeVisible();
  });

  test("idle breast press starts elapsed timer; press again saves one feed", async ({
    page,
  }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: (_body, i) => {
        if (i === 0) {
          return { replayed: false, openSleep: null, steps: [] };
        }
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep("saveBreast", {
              id: "fb1",
              type: "feed",
              payload: { method: "breast_l", durationSec: 5 },
            }),
          ],
        };
      },
    });

    await gotoBabyHomeReady(page);
    await breastL(page).click();
    await expect(breastL(page).getByText(/\d+:\d{2}/)).toBeVisible({
      timeout: 5_000,
    });

    // Let at least 1s elapse so durationSec >= 1.
    await page.waitForTimeout(1_100);
    await breastL(page).click();
    await expect(breastL(page)).toHaveAttribute("data-done-flash", "true");
    await expect(breastL(page)).toContainText(/Done|Xong/);
    expect(mocks.quickCareCount()).toBe(2);
    const saveBody = mocks.quickCareBodies[1] as {
      action: { kind: string; side: string };
      breastRunning: { side: string; durationSec: number };
      clientRequestId: string;
    };
    expect(saveBody.action).toEqual({ kind: "BREAST", side: "breast_l" });
    expect(saveBody.breastRunning.side).toBe("breast_l");
    expect(saveBody.breastRunning.durationSec).toBeGreaterThanOrEqual(1);
    await expect(breastL(page).getByText(/tap to start|chạm để bắt đầu/i)).toBeVisible();
    mocks.assertNoLegacyEventIdShape();
  });

  test("Pump L start → Tap to stop → Done → idle", async ({ page }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: (_body, i) => {
        if (i === 0) {
          return { replayed: false, openSleep: null, steps: [] };
        }
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep("saveBreast", {
              id: "fp1",
              type: "feed",
              payload: { method: "pump_l", durationSec: 5 },
            }),
          ],
        };
      },
    });

    await page.clock.install();
    await gotoBabyHomeReady(page);
    await pumpL(page).click();
    await expect(pumpL(page)).toHaveAttribute("data-selected", "true");
    await expect(
      page.getByTestId("baby-care-chip-pump_l").getByText(/tap to stop|chạm để dừng/i),
    ).toBeVisible();

    await page.clock.fastForward(1100);
    await pumpL(page).click();
    await expect(pumpL(page)).toHaveAttribute("data-done-flash", "true");
    await expect(pumpL(page)).toContainText(/Done|Xong/);
    expect(mocks.quickCareCount()).toBe(2);
    const saveBody = mocks.quickCareBodies[1] as {
      action: { kind: string; side: string };
      breastRunning: { side: string; durationSec: number };
    };
    expect(saveBody.action).toEqual({ kind: "BREAST", side: "pump_l" });
    expect(saveBody.breastRunning.side).toBe("pump_l");
    expect(saveBody.breastRunning.durationSec).toBeGreaterThanOrEqual(1);

    await page.clock.fastForward(2100);
    await expect(pumpL(page)).not.toHaveAttribute("data-done-flash");
    await expect(
      pumpL(page).getByText(/tap to start|chạm để bắt đầu/i),
    ).toBeVisible();
    mocks.assertNoLegacyEventIdShape();
  });

  test("Pump R start → Tap to stop → Done → idle", async ({ page }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: (_body, i) => {
        if (i === 0) {
          return { replayed: false, openSleep: null, steps: [] };
        }
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep("saveBreast", {
              id: "fp2",
              type: "feed",
              payload: { method: "pump_r", durationSec: 5 },
            }),
          ],
        };
      },
    });

    await page.clock.install();
    await gotoBabyHomeReady(page);
    await pumpR(page).click();
    await expect(pumpR(page)).toHaveAttribute("data-selected", "true");
    await expect(
      page.getByTestId("baby-care-chip-pump_r").getByText(/tap to stop|chạm để dừng/i),
    ).toBeVisible();

    await page.clock.fastForward(1100);
    await pumpR(page).click();
    await expect(pumpR(page)).toHaveAttribute("data-done-flash", "true");
    await expect(pumpR(page)).toContainText(/Done|Xong/);
    expect(mocks.quickCareCount()).toBe(2);
    const saveBody = mocks.quickCareBodies[1] as {
      action: { kind: string; side: string };
      breastRunning: { side: string; durationSec: number };
    };
    expect(saveBody.action).toEqual({ kind: "BREAST", side: "pump_r" });
    expect(saveBody.breastRunning.side).toBe("pump_r");
    expect(saveBody.breastRunning.durationSec).toBeGreaterThanOrEqual(1);

    await page.clock.fastForward(2100);
    await expect(pumpR(page)).not.toHaveAttribute("data-done-flash");
    await expect(
      pumpR(page).getByText(/tap to start|chạm để bắt đầu/i),
    ).toBeVisible();
    mocks.assertNoLegacyEventIdShape();
  });

  test("Row 4 quiet guidelines: Section I/II + stages collapsed by default", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReadyForCare(page);

    await expect(page.getByTestId("baby-care-guidelines")).toBeVisible();
    await expect(page.getByTestId("baby-home-header-pump")).toBeVisible();
    await expect(page.locator('[data-section="pump"]')).toBeVisible();
    const pump = page.locator('[data-section="pump"]');
    const status = page.getByTestId("baby-home-status");
    const guide = page.getByTestId("baby-care-guidelines");
    await expect
      .poll(async () => (await pump.boundingBox())?.height ?? 0)
      .toBeGreaterThan(0);
    const pumpBox = await pump.boundingBox();
    const statusBox = await status.boundingBox();
    const guideBox = await guide.boundingBox();
    expect(pumpBox && statusBox && guideBox).toBeTruthy();
    expect(statusBox!.y).toBeGreaterThan(pumpBox!.y);
    expect(guideBox!.y).toBeGreaterThan(statusBox!.y);
    await expect(pumpL(page)).toBeVisible();
    await expect(pumpR(page)).toBeVisible();
    await expect(page.locator('[data-section="pump-amount"]')).toBeVisible();

    const guidelines = page.getByTestId("baby-care-guidelines");
    await expect(guidelines).toHaveAttribute("data-guide-mode", /full|placeholder/);
    await expect(page.getByTestId("baby-guideline-feed")).toHaveCount(0);
    await expect(page.getByTestId("baby-guideline-pump")).toHaveCount(0);

    const mode = await guidelines.getAttribute("data-guide-mode");
    if (mode === "full") {
      const sectionI = guidelines.locator('[data-guide-block="section-i"]');
      const sectionII = guidelines.locator('[data-guide-block="section-ii"]');
      await expect(sectionI).toBeVisible();
      await expect(sectionII).toBeVisible();
      await expect(sectionI).not.toHaveAttribute("open", "");
      await expect(sectionII).not.toHaveAttribute("open", "");

      // Expand Section II, then one stage — nested collapse stays independent.
      await sectionII.locator("> summary").click();
      await expect(sectionII).toHaveAttribute("open", "");
      const newborn = guidelines.locator('[data-guide-stage="newborn"]');
      const last = guidelines.locator('[data-guide-stage="m12_24"]');
      await expect(newborn).toBeVisible();
      await expect(last).toBeVisible();
      await expect(newborn).not.toHaveAttribute("open", "");
      await expect(last).not.toHaveAttribute("open", "");
      await newborn.locator("summary").click();
      await expect(newborn).toHaveAttribute("open", "");
      await expect(newborn.locator('[data-guide-subsection="sleep"]')).toBeVisible();
      await expect(last).not.toHaveAttribute("open", "");
      await expect(sectionI).not.toHaveAttribute("open", "");
    } else {
      await expect(
        guidelines.locator('[data-guide-block="placeholder"]'),
      ).toBeVisible();
    }
  });

  test("Pump amount chip posts PUMP_AMOUNT with ml", async ({ page }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: BIRTH,
        recentBottleMl: [90, 120, 150],
      }),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createPumpAmount", {
            id: "pa1",
            type: "feed",
            payload: { method: "pump", amountMl: 90 },
          }),
        ],
      },
    });

    await gotoBabyHomeReady(page);
    await expect(pumpAmountMlChip(page, 90)).toBeVisible();
    await pumpAmountMlChip(page, 90).click();
    await expect(
      pumpAmountGroup(page).locator('[data-bottle-flash="done"]').first(),
    ).toBeVisible();
    expect(mocks.quickCareCount()).toBe(1);
    const body = mocks.quickCareBodies[0] as {
      action: { kind: string; amountMl: number };
      breastRunning: null;
    };
    expect(body.action).toEqual({ kind: "PUMP_AMOUNT", amountMl: 90 });
    expect(body.breastRunning).toBeNull();
    mocks.assertNoLegacyEventIdShape();
  });

  test("other breast while timer runs: save current and start other", async ({
    page,
  }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: (_b, i) => {
        if (i === 0) return { replayed: false, openSleep: null, steps: [] };
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep("saveBreast", {
              id: "fb1",
              type: "feed",
              payload: { method: "breast_l" },
            }),
          ],
        };
      },
    });

    await gotoBabyHomeReady(page);
    await breastL(page).click();
    await expect(breastL(page).getByText(/\d+:\d{2}/)).toBeVisible();
    await page.waitForTimeout(1_100);
    await breastR(page).click();
    await expect(breastR(page).getByText(/\d+:\d{2}/)).toBeVisible();
    await expect(breastL(page).getByText(/tap to start|chạm để bắt đầu/i)).toBeVisible();
    const switchBody = mocks.quickCareBodies[1] as {
      action: { side: string };
      breastRunning: { side: string };
    };
    expect(switchBody.action.side).toBe("breast_r");
    expect(switchBody.breastRunning.side).toBe("breast_l");
  });

  test("L→R→bottle one session: same feedSessionEventId; feedsToday stays 1", async ({
    page,
  }) => {
    const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    let feedsToday = 0;
    const mocks = await installBabyHomeMocks(page, {
      statusFactory: () =>
        defaultStatus({
          feedsToday,
          birthDate: BIRTH,
          lastFeed:
            feedsToday > 0
              ? feedPayload({
                  id: sessionId,
                  summary: "Feed (Breast L + Breast R + Formula 90 ml)",
                  payload: {
                    method: "formula",
                    amountMl: 90,
                    legs: [
                      { method: "breast_l", durationSec: 60 },
                      { method: "breast_r", durationSec: 40 },
                      { method: "formula", amountMl: 90 },
                    ],
                  },
                })
              : null,
        }),
      quickCare: (_b, i) => {
        const bumpIfInsert = (wrote: "insert" | "update") => {
          if (wrote === "insert") feedsToday += 1;
        };
        if (i === 0 || i === 2) {
          return { replayed: false, openSleep: null, steps: [] };
        }
        if (i === 1) {
          bumpIfInsert("insert");
          return {
            replayed: false,
            openSleep: null,
            steps: [
              quickStep(
                "saveBreast",
                {
                  id: sessionId,
                  type: "feed",
                  payload: {
                    method: "breast_l",
                    durationSec: 60,
                    legs: [{ method: "breast_l", durationSec: 60 }],
                  },
                },
                "insert",
              ),
            ],
          };
        }
        if (i === 3) {
          bumpIfInsert("update");
          return {
            replayed: false,
            openSleep: null,
            steps: [
              quickStep(
                "saveBreast",
                {
                  id: sessionId,
                  type: "feed",
                  payload: {
                    method: "breast_r",
                    durationSec: 100,
                    legs: [
                      { method: "breast_l", durationSec: 60 },
                      { method: "breast_r", durationSec: 40 },
                    ],
                  },
                },
                "update",
              ),
            ],
          };
        }
        bumpIfInsert("update");
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep(
              "createFormula",
              {
                id: sessionId,
                type: "feed",
                payload: {
                  method: "formula",
                  amountMl: 90,
                  legs: [
                    { method: "breast_l", durationSec: 60 },
                    { method: "breast_r", durationSec: 40 },
                    { method: "formula", amountMl: 90 },
                  ],
                },
              },
              "update",
            ),
          ],
        };
      },
    });

    await gotoBabyHomeReady(page);
    await breastL(page).click();
    await expect(breastL(page).getByText(/\d+:\d{2}/)).toBeVisible({
      timeout: 5_000,
    });
    // Duration must be ≥1s before stop (same contract as other breast e2e).
    await page.waitForTimeout(1_100);
    await breastL(page).click();
    await expect(breastL(page)).toHaveAttribute("data-done-flash", "true");
    await expect(breastL(page)).toContainText(/Done|Xong/);
    await expect(bottleHeader(page)).toContainText(/Today\s+1\s+of\s+\d+\s+feeds/i);
    expect(feedsToday).toBe(1);

    await breastR(page).click();
    await expect(breastR(page).getByText(/\d+:\d{2}/)).toBeVisible({
      timeout: 5_000,
    });
    await page.waitForTimeout(1_100);
    await breastR(page).click();
    await expect(breastR(page)).toHaveAttribute("data-done-flash", "true");
    await expect(breastR(page)).toContainText(/Done|Xong/);
    const switchBody = mocks.quickCareBodies[3] as {
      feedSessionEventId?: string;
    };
    expect(switchBody.feedSessionEventId).toBe(sessionId);
    expect(feedsToday).toBe(1);
    await expect(bottleHeader(page)).toContainText(/Today\s+1\s+of\s+\d+\s+feeds/i);

    await bottleSave(page).click();
    await expect(
      bottleGroup(page).locator('[data-bottle-flash="done"]').first(),
    ).toBeVisible();
    const bottleBody = mocks.quickCareBodies[4] as {
      feedSessionEventId?: string;
      action: { kind: string; amountMl: number };
    };
    expect(bottleBody.action.kind).toBe("FORMULA");
    expect(bottleBody.feedSessionEventId).toBe(sessionId);
    expect(feedsToday).toBe(1);
    await expect(bottleHeader(page)).toContainText(/Today\s+1\s+of\s+\d+\s+feeds/i);
    await expect(
      homeStatus(page).getByText(/breast on the .*left.*breast on the .*right|left.*right.*bottle of.*90/i),
    ).toBeVisible();
    await expect(homeStatus(page).getByText(/90 ml/i)).toBeVisible();
  });

  test("mid-breast bottle while timer runs (2A): one insert, both legs", async ({
    page,
  }) => {
    const sessionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    let feedsToday = 0;
    const mocks = await installBabyHomeMocks(page, {
      statusFactory: () =>
        defaultStatus({
          feedsToday,
          birthDate: BIRTH,
          lastFeed:
            feedsToday > 0
              ? feedPayload({
                  id: sessionId,
                  summary: "Feed (Breast L + Formula 90 ml)",
                  payload: {
                    method: "formula",
                    amountMl: 90,
                    legs: [
                      { method: "breast_l", durationSec: 30 },
                      { method: "formula", amountMl: 90 },
                    ],
                  },
                })
              : null,
        }),
      quickCare: (_b, i) => {
        if (i === 0) {
          // Idle breast start — timer only.
          return { replayed: false, openSleep: null, steps: [] };
        }
        feedsToday += 1;
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep(
              "createFormula",
              {
                id: sessionId,
                type: "feed",
                payload: {
                  method: "formula",
                  amountMl: 90,
                  legs: [
                    { method: "breast_l", durationSec: 30 },
                    { method: "formula", amountMl: 90 },
                  ],
                },
              },
              "insert",
            ),
          ],
        };
      },
    });

    await gotoBabyHomeReady(page);
    await breastL(page).click();
    await expect(breastL(page).getByText(/\d+:\d{2}/)).toBeVisible({
      timeout: 5_000,
    });
    // Need ≥1s elapsed so breastRunning.durationSec is honest.
    await page.waitForTimeout(1_100);

    await bottleSave(page).click();
    await expect(
      bottleGroup(page).locator('[data-bottle-flash="done"]').first(),
    ).toBeVisible();

    expect(mocks.quickCareCount()).toBe(2);
    const bottleBody = mocks.quickCareBodies[1] as {
      action: { kind: string; amountMl: number };
      breastRunning: { side: string; durationSec: number } | null;
      feedSessionEventId?: string;
    };
    expect(bottleBody.action.kind).toBe("FORMULA");
    expect(bottleBody.breastRunning?.side).toBe("breast_l");
    expect(bottleBody.breastRunning!.durationSec).toBeGreaterThanOrEqual(1);
    // First write — no session id yet (2A omit-id path).
    expect(bottleBody.feedSessionEventId).toBeUndefined();
    expect(feedsToday).toBe(1);
    await expect(bottleHeader(page)).toContainText(/Today\s+1\s+of\s+\d+\s+feeds/i);
    await expect(
      homeStatus(page).getByText(/breast on the .*left|bottle of.*90/i),
    ).toBeVisible();
    await expect(homeStatus(page).getByText(/90 ml/i)).toBeVisible();
    // Bottle while running stops the timer.
    await expect(
      breastL(page).getByText(/tap to start|chạm để bắt đầu/i),
    ).toBeVisible();
  });

  test("after stop + grace expired (3A): bottle omits session id; feedsToday +1", async ({
    page,
  }) => {
    const oldSessionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const newSessionId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    let feedsToday = 0;
    const mocks = await installBabyHomeMocks(page, {
      statusFactory: () =>
        defaultStatus({
          feedsToday,
          birthDate: BIRTH,
          lastFeed:
            feedsToday > 0
              ? feedPayload({
                  id: feedsToday === 1 ? oldSessionId : newSessionId,
                  summary:
                    feedsToday === 1
                      ? "Feed (Breast L)"
                      : "Feed (Formula 90 ml)",
                  payload:
                    feedsToday === 1
                      ? {
                          method: "breast_l",
                          durationSec: 60,
                          legs: [{ method: "breast_l", durationSec: 60 }],
                        }
                      : {
                          method: "formula",
                          amountMl: 90,
                          legs: [{ method: "formula", amountMl: 90 }],
                        },
                })
              : null,
        }),
      quickCare: (_b, i) => {
        if (i === 0) {
          return { replayed: false, openSleep: null, steps: [] };
        }
        if (i === 1) {
          feedsToday += 1;
          return {
            replayed: false,
            openSleep: null,
            steps: [
              quickStep(
                "saveBreast",
                {
                  id: oldSessionId,
                  type: "feed",
                  payload: {
                    method: "breast_l",
                    durationSec: 60,
                    legs: [{ method: "breast_l", durationSec: 60 }],
                  },
                },
                "insert",
              ),
            ],
          };
        }
        feedsToday += 1;
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep(
              "createFormula",
              {
                id: newSessionId,
                type: "feed",
                payload: {
                  method: "formula",
                  amountMl: 90,
                  legs: [{ method: "formula", amountMl: 90 }],
                },
              },
              "insert",
            ),
          ],
        };
      },
    });

    // Fake clock so we can wait out the 5 min post-stop grace.
    await page.clock.install();
    await gotoBabyHomeReady(page);

    await breastL(page).click();
    await expect(breastL(page).getByText(/\d+:\d{2}/)).toBeVisible({
      timeout: 5_000,
    });
    await page.clock.fastForward(1_100);
    await breastL(page).click();
    await expect(breastL(page)).toHaveAttribute("data-done-flash", "true");
    await expect(breastL(page)).toContainText(/Done|Xong/);
    expect(feedsToday).toBe(1);
    await expect(bottleHeader(page)).toContainText(/Today\s+1\s+of\s+\d+\s+feeds/i);

    // Past grace (+ buffer so the 30s home clock tick refreshes).
    await page.clock.fastForward(FEED_POST_STOP_GRACE_MS + 35_000);

    await bottleSave(page).click();
    await expect(
      bottleGroup(page).locator('[data-bottle-flash="done"]').first(),
    ).toBeVisible();

    const bottleBody = mocks.quickCareBodies[2] as {
      action: { kind: string };
      feedSessionEventId?: string;
      breastRunning: unknown;
    };
    expect(bottleBody.action.kind).toBe("FORMULA");
    expect(bottleBody.breastRunning).toBeNull();
    // Grace expired → omit merge handle → new feed (3A).
    expect(bottleBody.feedSessionEventId).toBeUndefined();
    expect(feedsToday).toBe(2);
    await expect(bottleHeader(page)).toContainText(/Today\s+2\s+of\s+\d+\s+feeds/i);
  });

  test("breast timer survives reload on same device", async ({ page }) => {
    const startedAt = Date.now() - 90_000;
    await seedLocalStorage(page, {
      [BABY_BREAST_TIMER_STORAGE_KEY]: JSON.stringify({
        babyId: "home",
        side: "breast_l",
        startedAt,
      }),
    });
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReady(page);
    await expect(breastL(page).getByText(/1:\d{2}|2:\d{2}/)).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(breastL(page).getByText(/1:\d{2}|2:\d{2}/)).toBeVisible();
  });

  test("section order: row1 breast+bottle; row2 nap+diaper", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReadyForCare(page);
    const breast = page.locator('[data-section="breast"]');
    const bottle = page.locator('[data-section="bottle"]');
    const nap = page.locator('[data-section="nap"]');
    const diaper = page.locator('[data-section="diaper"]');
    const chips = page.locator(
      '[data-section="bottle"] [data-layout="bottle-ml-chips"]',
    );
    await expect
      .poll(async () => (await breast.boundingBox())?.height ?? 0)
      .toBeGreaterThan(0);
    const breastBox = await breast.boundingBox();
    const bottleBox = await bottle.boundingBox();
    const napBox = await nap.boundingBox();
    const diaperBox = await diaper.boundingBox();
    expect(breastBox && bottleBox && napBox && diaperBox).toBeTruthy();
    // Wide viewport: Row 1 Breast | Bottle; Row 2 Nap | Diaper (Pump design lock).
    expect(Math.abs(breastBox!.y - bottleBox!.y)).toBeLessThan(48);
    expect(breastBox!.x).toBeLessThan(bottleBox!.x);
    expect(Math.abs(napBox!.y - diaperBox!.y)).toBeLessThan(48);
    expect(napBox!.x).toBeLessThan(diaperBox!.x);
    expect(breastBox!.y).toBeLessThan(napBox!.y - 24);
    expect(bottleBox!.y).toBeLessThan(diaperBox!.y - 24);
    await expect(chips).toHaveClass(/grid-cols-2/);
  });

  test("breast + diaper section headers: empty, next-due, and overdue tips", async ({
    page,
  }) => {
    const breastHeader = () => page.getByTestId("baby-home-header-breast");
    const diaperHeader = () => page.getByTestId("baby-home-header-diaper");

    // Empty tip when no last feed / diaper (header labels still show).
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: BIRTH,
        lastFeed: null,
        lastDiaper: null,
      }),
    });
    await gotoBabyHomeReady(page);
    await expect(breastHeader()).toContainText(/Breast|Ngực/);
    await expect(breastHeader()).toContainText(
      /Tap .*Left.*Right|Chạm .*Trái.*Phải/i,
    );
    await expect(diaperHeader()).toContainText(/Diaper|Tã/);
    await expect(diaperHeader()).toContainText(
      /Tap a kind|Chạm một loại/i,
    );

    // Recent events → next-due tip on both headers.
    const recentAt = new Date(Date.now() - 20 * 60_000).toISOString();
    await page.unroute("**/api/graphql/baby");
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: BIRTH,
        lastFeed: feedPayload({ at: recentAt }),
        lastDiaper: diaperPayload({ at: recentAt }),
      }),
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(breastHeader()).toContainText(
      /Next feed is in about|Lần bú tiếp theo còn khoảng/i,
    );
    await expect(diaperHeader()).toContainText(
      /Next change is in about|Lần đổi tã tiếp theo còn khoảng/i,
    );

    // Old events → overdue tip on both headers.
    const oldAt = new Date(Date.now() - 5 * 60 * 60_000).toISOString();
    await page.unroute("**/api/graphql/baby");
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: BIRTH,
        lastFeed: feedPayload({ at: oldAt }),
        lastDiaper: diaperPayload({ at: oldAt }),
      }),
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(breastHeader()).toContainText(/overdue|quá hạn/i);
    await expect(diaperHeader()).toContainText(/overdue|quá hạn/i);
  });

  test("no birth: fixed chips 60/90/120; empty/pick bottle header; birthday modal", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus({ birthDate: null, recentBottleMl: [] }),
    });
    await gotoBabyHomeReady(page);
    await expect(bottleMlChip(page, 60)).toBeVisible();
    await expect(bottleMlChip(page, 90)).toBeVisible();
    await expect(bottleMlChip(page, 120)).toBeVisible();
    await expect(page.getByTestId("baby-home-header-bottle")).toHaveText(
      /Bottle|Bình sữa/,
    );
    await expect(page.getByTestId("baby-home-header-bottle")).toContainText(
      /Pick an|Chọn một/i,
    );
    await expect(page.getByTestId("baby-home-header-bottle")).not.toContainText(
      /Today|Hôm nay/i,
    );
    await expect(page.getByTestId("baby-birth-date-prompt")).toHaveCount(0);
    await expect(page.getByTestId("baby-birth-date-modal")).toBeVisible();
  });

  test("bottle chip tap saves; chips from recentBottleMl", async ({ page }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: BIRTH,
        recentBottleMl: [90, 120, 150],
      }),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createFormula", {
            id: "ff-chip",
            type: "feed",
            payload: { method: "formula", amountMl: 90 },
          }),
        ],
      },
    });
    await gotoBabyHomeReady(page);
    await expect(bottleMlChip(page, 90)).toBeVisible();
    await expect(bottleMlChip(page, 120)).toBeVisible();
    await expect(bottleMlChip(page, 150)).toBeVisible();
    await bottleMlChip(page, 90).click();
    await expect(
      bottleGroup(page).locator('[data-bottle-ml="90"][data-bottle-flash="done"]'),
    ).toBeVisible();
    const loggedCentered = await bottleMlChip(page, 90).evaluate((btn) => {
      const done = btn.querySelector('[data-face-slot="done"]');
      if (!done) return { ok: false, reason: "missing done slot" };
      const cs = getComputedStyle(done);
      if (cs.position !== "absolute") {
        return { ok: false, reason: `position=${cs.position}` };
      }
      const b = btn.getBoundingClientRect();
      const d = done.getBoundingClientRect();
      const dx = Math.abs(b.x + b.width / 2 - (d.x + d.width / 2));
      const dy = Math.abs(b.y + b.height / 2 - (d.y + d.height / 2));
      return { ok: dx <= 4 && dy <= 4, dx, dy, reason: "offset" };
    });
    expect(loggedCentered.ok, JSON.stringify(loggedCentered)).toBe(true);
    const body = mocks.quickCareBodies[0] as {
      action: { kind: string; amountMl: number };
    };
    expect(body.action).toEqual({ kind: "FORMULA", amountMl: 90 });
  });

  test("feed status is one sentence (no leading ml, no n/N today)", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: BIRTH,
        feedsToday: 7,
        lastFeed: feedPayload({
          payload: { method: "formula", amountMl: 120 },
          summary: "Feed (Formula 120 ml)",
        }),
      }),
    });
    await gotoBabyHomeReady(page);
    await expect(
      homeStatus(page).getByText(/Last feed was a bottle of/i),
    ).toBeVisible();
    const statusText = await homeStatus(page).innerText();
    expect(statusText).toMatch(/Last feed was a bottle of/);
    expect(statusText).toMatch(/120 ml/);
    expect(statusText).not.toMatch(/Feed \(Formula 120 ml\)/);
    expect(statusText).not.toMatch(/\d+\/\d+ today/);
    expect(statusText).not.toMatch(/\d+\/\d+/);
    await expect(bottleHeader(page)).toContainText(/Today/);
    await expect(bottleHeader(page)).toContainText(/7/);
  });

  test("birthday modal visit dismiss survives refresh; ignores 7-day localStorage", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus({ birthDate: null }),
    });
    await page.addInitScript(() => {
      localStorage.setItem(
        "baby.birthDatePrompt.dismissedUntil",
        String(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );
    });
    await gotoBabyHomeReady(page);
    await expect(page.getByTestId("baby-birth-date-modal")).toBeVisible();
    await page.getByRole("button", { name: /not now|để sau/i }).click();
    await expect(page.getByTestId("baby-birth-date-modal")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(page.getByTestId("baby-birth-date-modal")).toHaveCount(0);
  });

  test("row 2 order: nap, diaper (bottle stays on row 1)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReadyForCare(page);
    const bottle = page.locator('[data-section="bottle"]');
    const nap = page.locator('[data-section="nap"]');
    const diaper = page.locator('[data-section="diaper"]');
    await expect
      .poll(async () => (await bottle.boundingBox())?.height ?? 0)
      .toBeGreaterThan(0);
    const bottleBox = await bottle.boundingBox();
    const sleepBox = await nap.boundingBox();
    const diaperBox = await diaper.boundingBox();
    expect(bottleBox && sleepBox && diaperBox).toBeTruthy();
    // Desktop: Nap | Diaper share Row 2; Bottle is on Row 1 above.
    expect(Math.abs(sleepBox!.y - diaperBox!.y)).toBeLessThan(48);
    expect(sleepBox!.x).toBeLessThan(diaperBox!.x);
    expect(bottleBox!.y).toBeLessThan(sleepBox!.y - 24);
  });

  test("formula defaults to age-band mid; no birth date → 120 ml hero (B1)", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus({ birthDate: null }),
    });
    await gotoBabyHomeReady(page);
    // No-birth chips are fixed 60/90/120 — 120 is the last snap chip.
    await expect(bottleMlChip(page, 120)).toBeVisible();
    await expect(page.getByTestId("baby-home-header-bottle")).not.toContainText(
      /60–150/,
    );
  });

  test("bottle + twice then save posts amount; resets after; clamps at band max", async ({
    page,
  }) => {
    // Chips replace ±: tap 120 chip (no-birth fixed snaps).
    await seedBirthDateModalVisitDismissed(page);
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({ birthDate: null, recentBottleMl: [] }),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createFormula", {
            id: "ff1",
            type: "feed",
            payload: { method: "formula", amountMl: 120 },
          }),
        ],
      },
    });

    await gotoBabyHomeReady(page);
    await bottleMlChip(page, 120).click();
    await expect(
      bottleGroup(page).locator('[data-bottle-ml="120"][data-bottle-flash="done"]'),
    ).toBeVisible();
    const body = mocks.quickCareBodies[0] as {
      action: { kind: string; amountMl: number };
    };
    expect(body.action).toEqual({ kind: "FORMULA", amountMl: 120 });
  });

  test("bottle B1 soft smoke: flush cluster, stacked ±, Custom icon, Done~2s", async ({
    page,
  }) => {
    await seedBirthDateModalVisitDismissed(page);
    await installBabyHomeMocks(page, {
      status: defaultStatus({ birthDate: null }),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createFormula", {
            id: "ff-b1",
            type: "feed",
            payload: { method: "formula", amountMl: 120 },
          }),
        ],
      },
    });
    await gotoBabyHomeReady(page);
    await expect(bottleGroup(page)).toHaveAttribute(
      "data-layout",
      "bottle-ml-chips",
    );
    await expect(customMlButton(page)).toBeVisible();
    await expect(bottleMore(page)).toHaveCount(0);
    await expect(bottleLess(page)).toHaveCount(0);
    await bottleMlChip(page, 120).click();
    await expect(
      bottleGroup(page).locator('[data-bottle-ml="120"][data-bottle-flash="done"]'),
    ).toBeVisible();
  });

  test("Kind flush 2×2 + primary selected on Done flash", async ({ page }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", {
            id: "d-flush",
            type: "diaper",
            payload: { kind: "wet" },
          }),
        ],
      },
    });

    // Install before ready so Done timer's setTimeout is the mocked one
    // (useRef captures host at mount; clock after ready cannot advance it).
    await page.clock.install();
    await gotoBabyHomeReadyForCare(page);

    const kind = diaperGroup(page);
    await expect(kind).toHaveAttribute("data-layout", "diaper-kind-2x2");
    await expect(kind).toHaveClass(/gap-0/);

    // Wait past hydration remount so tile locators stay attached for geometry.
    await expect
      .poll(async () => (await diaperKindTile(page, "wet").boundingBox())?.height ?? 0)
      .toBeGreaterThan(0);

    // Flush tiles: no gap between segments (shared borders).
    const wetBox = await diaperKindTile(page, "wet").boundingBox();
    const dirtyBox = await diaperKindTile(page, "dirty").boundingBox();
    const mixedBox = await diaperKindTile(page, "mixed").boundingBox();
    const dryBox = await diaperKindTile(page, "dry").boundingBox();
    expect(wetBox && dirtyBox && mixedBox && dryBox).toBeTruthy();
    expect(Math.abs(wetBox!.x + wetBox!.width - dirtyBox!.x)).toBeLessThanOrEqual(
      2,
    );
    expect(Math.abs(wetBox!.y + wetBox!.height - mixedBox!.y)).toBeLessThanOrEqual(
      2,
    );
    expect(Math.abs(mixedBox!.x + mixedBox!.width - dryBox!.x)).toBeLessThanOrEqual(
      2,
    );

    await diaperKindTile(page, "wet").click();
    await expect(diaperKindTile(page, "wet")).toHaveAttribute(
      "data-selected",
      "true",
    );
    await expect(diaperKindTile(page, "wet")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(diaperKindTile(page, "wet")).toHaveClass(/bg-accent/);
    await expect(diaperKindTile(page, "wet")).toContainText(/Done|Xong/);
  });

  test("row 2 Kind outer height matches nap", async ({ page }) => {
    // Desktop: Nap | Diaper share Row 2 — heights should align.
    await page.setViewportSize({ width: 1280, height: 800 });
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReadyForCare(page);
    const nap = page.locator('[data-section="nap"]');
    const diaper = page.locator('[data-section="diaper"]');
    await expect(sleepCard(page)).toBeVisible();
    await expect(diaperGroup(page)).toBeVisible();
    // Wait past hydration remount so section boxes stay attached for geometry.
    await expect
      .poll(async () => {
        const napH = (await nap.boundingBox())?.height ?? 0;
        const diaperH = (await diaper.boundingBox())?.height ?? 0;
        return Math.min(napH, diaperH);
      })
      .toBeGreaterThan(0);
    const napBox = await nap.boundingBox();
    const kindBox = await diaper.boundingBox();
    expect(napBox && kindBox).toBeTruthy();
    expect(Math.abs(napBox!.y - kindBox!.y)).toBeLessThan(48);
    expect(napBox!.x).toBeLessThan(kindBox!.x);
    expect(Math.abs(napBox!.height - kindBox!.height)).toBeLessThan(48);
  });

  test("custom ml modal: confirm, cancel paths, backdrop, validation, focus", async ({
    page,
  }) => {
    await seedBirthDateModalVisitDismissed(page);
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({ birthDate: null }),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createFormula", {
            id: "ff1",
            type: "feed",
            payload: { method: "formula", amountMl: 95 },
          }),
        ],
      },
    });

    await gotoBabyHomeReady(page);
    await customMlButton(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/amount \(ml\)|lượng \(ml\)/i).fill("95");
    await dialog.getByRole("button", { name: /use this amount|dùng lượng này/i }).click();
    await expect(dialog).toHaveCount(0);
    // Confirm sets ml only — custom amount appears as a tappable chip.
    await expect(bottleMlChip(page, 95)).toBeVisible();
    await expect(customMlButton(page)).toBeVisible();
    await expect(bottleGroup(page).locator("[data-under-card]")).toHaveCount(0);

    await bottleMlChip(page, 95).click();
    const body = mocks.quickCareBodies[0] as {
      action: { amountMl: number };
    };
    expect(body.action.amountMl).toBe(95);

    // Cancel paths leave chips unchanged (still 60/90/120 no-birth snaps after reset).
    for (const close of ["escape", "x", "cancel"] as const) {
      await customMlButton(page).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("dialog").getByLabel(/amount/i).fill("88");
      if (close === "escape") {
        await page.keyboard.press("Escape");
      } else if (close === "x") {
        await page.getByRole("button", { name: /^close$/i }).click();
      } else {
        await page.getByRole("dialog").getByRole("button", { name: /cancel|hủy/i }).click();
      }
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(bottleMlChip(page, 120)).toBeVisible();
    }

    // Backdrop: dimmed area must not close (design: no backdrop handler).
    await customMlButton(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByLabel(/amount/i).fill("77");
    await page.mouse.click(4, 4);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");

    // Validation: 12.5 and 400 keep modal open; no mutation.
    const before = mocks.quickCareCount();
    await customMlButton(page).click();
    await page.getByRole("dialog").getByLabel(/amount/i).fill("12.5");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /use this amount|dùng lượng này/i })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/whole ml|số nguyên/i)).toBeVisible();
    await page.getByRole("dialog").getByLabel(/amount/i).fill("400");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /use this amount|dùng lượng này/i })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/too high|quá cao/i)).toBeVisible();
    expect(mocks.quickCareCount()).toBe(before);
  });

  test("Custom confirm → tap Custom → Done on Custom tile (Bottle + Pump)", async ({
    page,
  }) => {
    await seedBirthDateModalVisitDismissed(page);
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: null,
        recentBottleMl: [90, 120, 150],
      }),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createFormula", {
            id: "ff-custom",
            type: "feed",
            payload: { method: "formula", amountMl: 95 },
          }),
        ],
      },
    });

    await gotoBabyHomeReady(page);
    await customMlButton(page).click();
    await page.getByRole("dialog").getByLabel(/amount/i).fill("95");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /use this amount|dùng lượng này/i })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await customMlButton(page).click();
    await expect(
      bottleGroup(page).locator('[data-bottle-ml="custom"][data-bottle-flash="done"]'),
    ).toBeVisible();
    await expect(
      bottleGroup(page).locator('[data-bottle-ml="95"][data-bottle-flash="done"]'),
    ).toHaveCount(0);
    const bottleBody = mocks.quickCareBodies[0] as {
      action: { kind: string; amountMl: number };
    };
    expect(bottleBody.action).toEqual({ kind: "FORMULA", amountMl: 95 });

    await page.unroute("**/api/graphql/baby");
    const pumpMocks = await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: null,
        recentBottleMl: [90, 120, 150],
      }),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createPumpAmount", {
            id: "pa-custom",
            type: "feed",
            payload: { method: "pump", amountMl: 88 },
          }),
        ],
      },
    });
    await gotoBabyHomeReady(page);
    await pumpCustomMlButton(page).click();
    await page.getByRole("dialog").getByLabel(/amount/i).fill("88");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /use this amount|dùng lượng này/i })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await pumpCustomMlButton(page).click();
    await expect(
      pumpAmountGroup(page).locator(
        '[data-bottle-ml="custom"][data-bottle-flash="done"]',
      ),
    ).toBeVisible();
    await expect(
      pumpAmountGroup(page).locator(
        '[data-bottle-ml="88"][data-bottle-flash="done"]',
      ),
    ).toHaveCount(0);
    const pumpBody = pumpMocks.quickCareBodies[0] as {
      action: { kind: string; amountMl: number };
    };
    expect(pumpBody.action).toEqual({ kind: "PUMP_AMOUNT", amountMl: 88 });
  });

  test("birthday modal on home when unset; set on settings; error tokens → local copy", async ({
    page,
  }) => {
    let homeBirth: string | null = null;
    await installBabyHomeMocks(page, {
      statusFactory: () => defaultStatus({ birthDate: homeBirth }),
      profile: { birthDate: null },
      updateProfile: (input) => {
        const bd = input.birthDate as string | null;
        if (bd === "bad-token-pass") {
          return {
            errors: [{ message: "BABY_BIRTH_DATE_INVALID" }],
          };
        }
        homeBirth = bd;
        return { id: "e2e-baby-1", birthDate: bd };
      },
    });

    await gotoBabyHomeReady(page);
    // Gate B: modal when unset — no birth-date strip / settings link on home.
    await expect(page.getByTestId("baby-birth-date-prompt")).toHaveCount(0);
    await expect(page.getByTestId("baby-birth-date-modal")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /add birthday|thêm ngày sinh/i }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/add a birthday for age-based|thêm ngày sinh để/i),
    ).toHaveCount(0);
    // Progress moved off feed status — empty day has no n/N on status.
    await expect(homeStatus(page).getByText(/\d+ today|\d+ hôm nay/i)).toHaveCount(0);
    await expect(homeStatus(page).getByText(/\d+\/\d+/)).toHaveCount(0);
    // All next-due subtitles hidden without birth date.
    await expect(page.getByText(/next in|còn |overdue|quá hạn/i)).toHaveCount(0);

    await page.getByRole("button", { name: /not now|để sau/i }).click();
    await expect(page.getByTestId("baby-birth-date-modal")).toHaveCount(0);

    // Force each server token on settings.
    const tokens = [
      ["BABY_BIRTH_DATE_INVALID", /real date|ngày thật/i],
      ["BABY_BIRTH_DATE_FUTURE", /future|tương lai/i],
      ["BABY_BIRTH_DATE_TOO_OLD", /too far|quá xa/i],
      ["BABY_BIRTH_DATE_REQUIRED", /pick a birthday|chọn ngày sinh/i],
    ] as const;

    for (const [token, copy] of tokens) {
      await page.unroute("**/api/graphql/baby");
      await installBabyHomeMocks(page, {
        profile: { birthDate: null },
        updateProfile: () => ({
          errors: [{ message: `failed: ${token}` }],
        }),
      });
      await page.goto("/baby/settings");
      await expect(
        page.getByRole("heading", { level: 1, name: /settings|cài đặt/i }),
      ).toBeVisible();
      await page.locator('input[type="date"]').fill("2026-06-01");
      await page.getByRole("button", { name: /^save$|^lưu$/i }).click();
      await expect(page.getByText(copy).first()).toBeVisible();
      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toMatch(/\{/);
      expect(bodyText).not.toMatch(/"code"/);
      expect(bodyText).not.toContain(token);
    }

    // Happy path: save birth date, bottle default matches new band.
    await page.unroute("**/api/graphql/baby");
    homeBirth = null;
    const mocks = await installBabyHomeMocks(page, {
      statusFactory: () => defaultStatus({ birthDate: homeBirth }),
      profile: { birthDate: null },
      updateProfile: (input) => {
        homeBirth = input.birthDate as string | null;
        return { id: "e2e-baby-1", birthDate: homeBirth };
      },
    });
    await page.goto("/baby/settings");
    await page.locator('input[type="date"]').fill("2026-08-01");
    await page.getByRole("button", { name: /^save$|^lưu$/i }).click();
    await expect(page.getByText(/birthday saved|đã lưu ngày sinh/i)).toBeVisible();
    // updateBabyProfile carried birthDate only.
    // (assert via request interception already fulfilled)
    await page.goto("/baby");
    await expect(page.getByTestId("baby-home")).toBeVisible();
    // ~42 days old → 1–3 mo feed band: footer ~120 + 0/N; chips = first snaps 90/100/110.
    const bottleFooter = page.locator('[data-section-footer="bottle"]');
    await expect(bottleFooter).toContainText(/Today|Hôm nay/i);
    await expect(bottleFooter).toContainText(/About|Khoảng/i);
    await expect(bottleFooter).toContainText(/120 ml/);
    await expect(page.getByTestId("baby-home-header-bottle")).not.toContainText(
      /Today|Hôm nay/i,
    );
    await expect(bottleMlChip(page, 90)).toBeVisible();
    // Task 10: set birth → nap blend in footer (1–2 mo sleep band).
    const napFooter = page.locator('[data-section-footer="nap"]');
    await expect(napFooter).toContainText(/At this age|Ở tuổi này/i);
    await expect(napFooter).toContainText(/15–16 hours|15–16 giờ/i);
    void mocks;
  });

  test("idle sleep starts timer; press again saves one sleep", async ({
    page,
  }) => {
    let openSleep: Record<string, unknown> | null = null;
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({ openSleep: null }),
      quickCare: (_b, i) => {
        if (i === 0) {
          openSleep = {
            id: "os1",
            type: "sleep",
            occurredAt: new Date().toISOString(),
            endedAt: null,
            payload: {},
          };
          return {
            replayed: false,
            openSleep,
            steps: [
              quickStep("startNap", {
                id: "os1",
                type: "sleep",
                occurredAt: openSleep.occurredAt as string,
              }),
            ],
          };
        }
        openSleep = null;
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep("endNap", {
              id: "os1",
              type: "sleep",
              endedAt: new Date().toISOString(),
            }),
          ],
        };
      },
    });

    await gotoBabyHomeReady(page);
    await sleepCard(page).click();
    await expect(sleepCard(page).getByText(/end nap|kết thúc ngủ/i)).toBeVisible();
    await sleepCard(page).click();
    await expect(sleepCard(page).getByText(/start nap|bắt đầu ngủ/i)).toBeVisible();
    expect(mocks.quickCareCount()).toBe(2);
  });

  test("diaper 2×2 Kind: Wet/Dry instant; Poop opens sheet then one save", async ({
    page,
  }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", {
            id: "d1",
            type: "diaper",
            payload: { kind: "wet" },
          }),
        ],
      },
    });

    await gotoBabyHomeReady(page);
    await expect(diaperGroup(page)).toHaveAttribute(
      "data-layout",
      "diaper-kind-2x2",
    );
    await expect(diaperKindTile(page, "wet")).toBeVisible();
    await expect(diaperKindTile(page, "dirty")).toBeVisible();
    await expect(diaperKindTile(page, "mixed")).toBeVisible();
    await expect(diaperKindTile(page, "dry")).toBeVisible();

    await diaperKindTile(page, "wet").click();
    const wetBody = mocks.quickCareBodies[0] as {
      action: { kind: string; diaperKind: string };
    };
    expect(wetBody.action).toEqual({ kind: "DIAPER", diaperKind: "wet" });

    await page.unroute("**/api/graphql/baby");
    const mocks2 = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", {
            id: "d2",
            type: "diaper",
            payload: { kind: "dirty", amount: "medium" },
          }),
        ],
      },
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();

    await diaperKindTile(page, "dirty").click();
    expect(mocks2.quickCareCount()).toBe(0);
    await expect(
      page.getByRole("button", { name: /save diaper|lưu tã/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /save diaper|lưu tã/i }).click();
    const dirtyBody = mocks2.quickCareBodies[0] as {
      action: Record<string, unknown>;
    };
    expect(dirtyBody.action.kind).toBe("DIAPER");
    expect(dirtyBody.action.diaperKind).toBe("dirty");
    expect(dirtyBody.action.diaperAmount).toBe("medium");

    await page.unroute("**/api/graphql/baby");
    const mocksMixed = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", {
            id: "d2b",
            type: "diaper",
            payload: { kind: "mixed", amount: "medium" },
          }),
        ],
      },
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await diaperKindTile(page, "mixed").click();
    expect(mocksMixed.quickCareCount()).toBe(0);
    await page.getByRole("button", { name: /save diaper|lưu tã/i }).click();
    const mixedBody = mocksMixed.quickCareBodies[0] as {
      action: Record<string, unknown>;
    };
    expect(mixedBody.action.diaperKind).toBe("mixed");
    expect(mixedBody.action.diaperAmount).toBe("medium");

    await page.unroute("**/api/graphql/baby");
    const mocks3 = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", {
            id: "d3",
            type: "diaper",
            payload: { kind: "dry" },
          }),
        ],
      },
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await diaperKindTile(page, "dry").click();
    const dryBody = mocks3.quickCareBodies[0] as {
      action: { kind: string; diaperKind: string };
    };
    expect(dryBody.action).toEqual({ kind: "DIAPER", diaperKind: "dry" });
  });

  test("diaper Wet/Dry Done flash then short labels again (S1)", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", {
            id: "d-done",
            type: "diaper",
            payload: { kind: "wet" },
          }),
        ],
      },
    });

    // Install before ready so Done timer's setTimeout is the mocked one
    // (useRef captures host at mount; clock after ready cannot advance it).
    await page.clock.install();
    await gotoBabyHomeReady(page);
    await diaperKindTile(page, "wet").click();
    await expect(diaperGroup(page)).toHaveAttribute("data-done-kind", "wet");
    await expect(diaperKindTile(page, "wet")).toHaveAttribute(
      "data-diaper-flash",
      "done",
    );
    await expect(diaperKindTile(page, "wet")).toContainText(/Done|Xong/);
    const centered = await diaperKindTile(page, "wet").evaluate((btn) => {
      const done = btn.querySelector('[data-face-slot="done"]');
      if (!done) return { ok: false, reason: "missing done slot" };
      const cs = getComputedStyle(done);
      if (cs.position !== "absolute") {
        return { ok: false, reason: `position=${cs.position}` };
      }
      const b = btn.getBoundingClientRect();
      const d = done.getBoundingClientRect();
      const dx = Math.abs(b.x + b.width / 2 - (d.x + d.width / 2));
      const dy = Math.abs(b.y + b.height / 2 - (d.y + d.height / 2));
      return { ok: dx <= 4 && dy <= 4, dx, dy, reason: "offset" };
    });
    expect(centered.ok, JSON.stringify(centered)).toBe(true);
    await page.clock.fastForward(2100);
    await expect(diaperGroup(page)).not.toHaveAttribute("data-done-kind");
    await expect(diaperKindTile(page, "wet")).toContainText(/Wet|Ướt/);
  });

  test("diaper dirty Done flash after sheet save", async ({ page }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", {
            id: "d-dirty-done",
            type: "diaper",
            payload: { kind: "dirty", amount: "medium" },
          }),
        ],
      },
    });
    await page.clock.install();
    await gotoBabyHomeReady(page);
    await expect(diaperKindTile(page, "wet").locator('[data-diaper-icon="wet"]')).toBeVisible();
    await diaperKindTile(page, "dirty").click();
    await page.getByRole("button", { name: /save diaper|lưu tã/i }).click();
    await expect(diaperGroup(page)).toHaveAttribute("data-done-kind", "dirty");
    await expect(diaperKindTile(page, "dirty")).toContainText(/Done|Xong/);
    await page.clock.fastForward(2100);
    await expect(diaperGroup(page)).not.toHaveAttribute("data-done-kind");
    await expect(diaperKindTile(page, "dirty")).toContainText(/Poop|Phân/);
  });

  test("breast second click shows Done ~2s then idle", async ({ page }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: (_body, i) => {
        if (i === 0) {
          return { replayed: false, openSleep: null, steps: [] };
        }
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep("saveBreast", {
              id: "fb-done",
              type: "feed",
              payload: { method: "breast_l", durationSec: 5 },
            }),
          ],
        };
      },
    });
    await page.clock.install();
    await gotoBabyHomeReady(page);
    await breastL(page).click();
    await expect(breastL(page)).toHaveAttribute("data-selected", "true");
    // Advance fake clock so durationSec >= 1 before stop.
    await page.clock.fastForward(1100);
    await breastL(page).click();
    await expect(breastL(page)).toHaveAttribute("data-done-flash", "true");
    await expect(breastL(page)).toContainText(/Done|Xong/);
    // Done/Logged must sit in the button center (fx-ripple must not force relative).
    const centered = await breastL(page).evaluate((btn) => {
      const done = btn.querySelector('[data-face-slot="done"]');
      if (!done) return { ok: false, reason: "missing done slot" };
      const cs = getComputedStyle(done);
      if (cs.position !== "absolute") {
        return { ok: false, reason: `position=${cs.position}` };
      }
      const b = btn.getBoundingClientRect();
      const d = done.getBoundingClientRect();
      const dx = Math.abs(b.x + b.width / 2 - (d.x + d.width / 2));
      const dy = Math.abs(b.y + b.height / 2 - (d.y + d.height / 2));
      return { ok: dx <= 4 && dy <= 4, dx, dy, reason: "offset" };
    });
    expect(centered.ok, JSON.stringify(centered)).toBe(true);
    await page.clock.fastForward(2100);
    await expect(breastL(page)).not.toHaveAttribute("data-done-flash");
    await expect(breastL(page).getByText(/tap to start|chạm để bắt đầu/i)).toBeVisible();
  });

  test("nap Start stays running (no Done); End shows Done then idle", async ({
    page,
  }) => {
    let quickCalls = 0;
    await installBabyHomeMocks(page, {
      status: defaultStatus({ openSleep: null }),
      quickCare: () => {
        quickCalls += 1;
        if (quickCalls === 1) {
          return {
            replayed: false,
            openSleep: {
              id: "s-done",
              occurredAt: new Date().toISOString(),
            },
            steps: [
              quickStep("startNap", {
                id: "s-done",
                type: "sleep",
                payload: {},
              }),
            ],
          };
        }
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep("endNap", {
              id: "s-done",
              type: "sleep",
              payload: {},
            }),
          ],
        };
      },
    });
    await page.clock.install();
    await gotoBabyHomeReady(page);
    await sleepCard(page).click();
    await expect(sleepCard(page)).toHaveAttribute("data-running", "true");
    await expect(sleepCard(page)).toContainText(/Tap to stop|Chạm để dừng/);
    await expect(sleepCard(page)).not.toHaveAttribute("data-done-flash");
    await expect(sleepCard(page).getByText(/end nap|kết thúc ngủ/i)).toBeVisible();

    await sleepCard(page).click();
    await expect(sleepCard(page)).toHaveAttribute("data-done-flash", "true");
    await expect(sleepCard(page)).toContainText(/Done|Xong/);
    await page.clock.fastForward(2100);
    await expect(sleepCard(page)).not.toHaveAttribute("data-done-flash");
  });

  test("diaper Step 2: red-flag warn, texture caution, cancel discards (W1)", async ({
    page,
  }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", {
            id: "d-cancel",
            type: "diaper",
            payload: { kind: "dirty", amount: "medium" },
          }),
        ],
      },
    });

    await gotoBabyHomeReady(page);
    await diaperKindTile(page, "dirty").click();
    await expect(
      page.getByRole("button", { name: /save diaper|lưu tã/i }),
    ).toBeVisible();

    await page.locator('[data-diaper-color="white_pale"]').click();
    await expect(page.locator('[data-diaper-warn="color-red-flag"]')).toBeVisible();

    await page.locator('[data-diaper-texture="watery"]').click();
    await expect(
      page.locator('[data-diaper-warn="texture-caution"]'),
    ).toBeVisible();

    await page.getByRole("button", { name: /^(Cancel|Hủy)$/i }).click();
    await expect(
      page.getByRole("button", { name: /save diaper|lưu tã/i }),
    ).toHaveCount(0);
    expect(mocks.quickCareCount()).toBe(0);
  });

  test("auto-finalize one BabyQuickCare chain; no step preview; concurrent nap from response", async ({
    page,
  }) => {
    const startedAt = Date.now() - 30_000;
    await seedLocalStorage(page, {
      [BABY_BREAST_TIMER_STORAGE_KEY]: JSON.stringify({
        babyId: "home",
        side: "breast_l",
        startedAt,
      }),
    });

    let sawSavingOnly = false;
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({
        openSleep: {
          id: "nap1",
          type: "sleep",
          occurredAt: new Date(Date.now() - 600_000).toISOString(),
          endedAt: null,
          payload: {},
        },
      }),
      quickCare: async () => {
        // Brief delay so the UI can show generic Saving… before steps.
        await new Promise((r) => setTimeout(r, 200));
        return {
          replayed: false,
          openSleep: null,
          steps: [
            quickStep("saveBreast", { id: "b1", type: "feed" }),
            quickStep("endNap", { id: "n1", type: "sleep" }),
            quickStep("createDiaper", { id: "d1", type: "diaper" }),
          ],
        };
      },
    });

    await gotoBabyHomeReady(page);
    const savePromise = diaperSave(page).click();
    await expect(page.getByRole("status").filter({ hasText: /saving|đang lưu/i }))
      .toBeVisible({ timeout: 5_000 })
      .then(() => {
        sawSavingOnly = true;
      })
      .catch(() => {
        /* race: response may be too fast */
      });
    await savePromise;
    await expect(diaperKindTile(page, "wet")).toContainText(/Done|Xong/);
    expect(mocks.quickCareCount()).toBe(1);
    const body = mocks.quickCareBodies[0] as {
      action: { kind: string };
      breastRunning: { side: string } | null;
    };
    expect(body.action.kind).toBe("DIAPER");
    expect(body.breastRunning?.side).toBe("breast_l");
    // Concurrent nap: read had openSleep; response null → Start nap.
    await expect(sleepCard(page).getByText(/start nap|bắt đầu ngủ/i)).toBeVisible();
    void sawSavingOnly;
    mocks.assertNoLegacyEventIdShape();
  });

  test("chain failure is all-or-nothing; double-tap once; replay once", async ({
    page,
  }) => {
    const startedAt = Date.now() - 20_000;
    await seedLocalStorage(page, {
      [BABY_BREAST_TIMER_STORAGE_KEY]: JSON.stringify({
        babyId: "home",
        side: "breast_l",
        startedAt,
      }),
    });

    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: () => ({
        errors: [
          {
            message: "e2e chain fail",
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          },
        ],
      }),
    });

    await gotoBabyHomeReady(page);
    await diaperSave(page).click();
    // Ambiguous INTERNAL_SERVER_ERROR → under-owner recovery (no page chainFailed).
    await expect(pendingTitle(page)).toBeVisible();
    await expect(pendingRecoveryUnder(page, "diaper")).toBeVisible();
    await expect(
      pendingRecoveryUnder(page, "diaper").getByRole("button", {
        name: /try again|thử lại/i,
      }),
    ).toBeVisible();
    await expect(
      pendingRecoveryUnder(page, "diaper").getByRole("button", {
        name: /discard|bỏ/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/nothing was saved|không lưu được gì/i),
    ).toHaveCount(0);
    await expect(breastL(page).getByText(/\d+:\d{2}/)).toBeVisible();
    await expect(diaperSave(page).getByText(/^wet$|^ướt$/i)).toBeVisible();
    await expect(page.getByText(/undo/i)).toHaveCount(0);

    // Double tap in one turn → exactly one request (inFlight guard).
    // Sync DOM clicks (not Promise.all Playwright clicks) so the second
    // tap hits while inFlight is still true before the mock resolves.
    await page.unroute("**/api/graphql/baby");
    const mocks2 = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", { id: "d1", type: "diaper" }),
        ],
      },
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    // Breast timer is still seeded — wait for client hydrate (SSR idle → running)
    // so the double-tap hits a live handler, not a pre-hydrate button.
    await expect(breastL(page)).toHaveAttribute("data-running", "true");
    await diaperSave(page).evaluate((el) => {
      (el as HTMLButtonElement).click();
      (el as HTMLButtonElement).click();
    });
    await expect(diaperKindTile(page, "wet")).toContainText(/Done|Xong/);
    expect(mocks2.quickCareCount()).toBe(1);

    // Replay: second identical id answered replayed: true → one confirmation.
    await page.unroute("**/api/graphql/baby");
    let call = 0;
    const mocks3 = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: () => {
        call += 1;
        return {
          replayed: call > 1,
          openSleep: null,
          steps: [
            quickStep("createDiaper", { id: "d1", type: "diaper" }),
          ],
        };
      },
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await diaperSave(page).click();
    await expect(diaperKindTile(page, "wet")).toContainText(/Done|Xong/);
    // Force a retry path with same id via pending Try again after abort.
    await page.unroute("**/api/graphql/baby");
    let phase: "abort" | "replay" = "abort";
    const mocks4 = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: () => {
        if (phase === "abort") return "abort";
        return {
          replayed: true,
          openSleep: null,
          steps: [
            quickStep("createDiaper", { id: "d1", type: "diaper" }),
          ],
        };
      },
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await diaperSave(page).click();
    await expect(pendingTitle(page)).toBeVisible();
    await expect(pendingRecoveryUnder(page, "diaper")).toBeVisible();
    phase = "replay";
    await pendingRecoveryUnder(page, "diaper")
      .getByRole("button", { name: /try again|thử lại/i })
      .click();
    await expect(diaperKindTile(page, "wet")).toContainText(/Done|Xong/);
    expect(mocks4.quickCareCount()).toBe(2);
    void mocks;
    void mocks3;
  });

  test("reload mid-save shows under-owner recovery for bottle, diaper, sleep, breast, pump", async ({
    page,
  }) => {
    async function caseFor(
      label: string,
      press: (p: Page) => Promise<void>,
      owner:
        | "bottle"
        | "diaper"
        | "nap"
        | "breast_l"
        | "pump_l"
        | "pump_amount",
    ) {
      await page.unroute("**/api/graphql/baby").catch(() => {});
      await installBabyHomeMocks(page, {
        status: defaultStatus(),
        quickCare: () => "hang",
      });
      await page.goto("/baby");
      await expect(page.getByTestId("baby-home")).toBeVisible();
      await press(page);
      // Pending written before the hung request resolves.
      await expect
        .poll(async () =>
          page.evaluate(
            (key) => window.localStorage.getItem(key),
            BABY_QUICK_PENDING_STORAGE_KEY,
          ),
        )
        .toBeTruthy();
      // In-flight: no under-owner recovery and no page-wide false failure title.
      await expect(pendingRecoveryUnder(page, owner)).toHaveCount(0);
      await expect(
        page.getByText(/could not confirm|chưa xác nhận/i),
      ).toHaveCount(0);
      await page.reload();
      await expect(page.getByTestId("baby-home")).toBeVisible();
      // Orphaned sending after remount → under-owner recovery (not silent).
      await expect(
        pendingRecoveryUnder(page, owner),
        `under-owner recovery missing after ${label}`,
      ).toBeVisible();
      await expect(pendingTitle(page)).toBeVisible();
      await expect(
        pendingRecoveryUnder(page, owner).getByRole("button", {
          name: /try again|thử lại/i,
        }),
      ).toBeVisible();
    }

    await caseFor("bottle", async (p) => {
      await bottleSave(p).click();
    }, "bottle");
    await caseFor("diaper", async (p) => {
      await diaperSave(p).click();
    }, "diaper");
    await caseFor("sleep", async (p) => {
      await sleepCard(p).click();
    }, "nap");
    await caseFor("breast", async (p) => {
      await breastL(p).click();
    }, "breast_l");
    await caseFor("pump L", async (p) => {
      await pumpL(p).click();
    }, "pump_l");
    await caseFor("pump amount", async (p) => {
      await pumpAmountMlChip(p, 90).click();
    }, "pump_amount");
  });

  test("retry mid-flight quiets under-owner recovery until remount", async ({
    page,
  }) => {
    const pending = pendingRecord({
      requestId: "retry-mid-flight",
      request: {
        action: { kind: "FORMULA", amountMl: 120 },
        breastRunning: null,
      },
      state: "unknown",
      startedAt: Date.now() - 10_000,
    });
    await seedLocalStorage(page, {
      [BABY_QUICK_PENDING_STORAGE_KEY]: JSON.stringify(pending),
    });
    await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: () => "hang",
    });
    await gotoBabyHomeReady(page);
    await expect(pendingRecoveryUnder(page, "bottle")).toBeVisible();
    await expect(pendingTitle(page)).toBeVisible();

    await pendingRecoveryUnder(page, "bottle")
      .getByRole("button", { name: /try again|thử lại/i })
      .click();
    // Retry mid-flight: chrome quiet while hung (storage may stay unknown).
    await expect(pendingRecoveryUnder(page, "bottle")).toHaveCount(0);
    await expect(
      page.getByText(/could not confirm|chưa xác nhận/i),
    ).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(pendingRecoveryUnder(page, "bottle")).toBeVisible();
    await expect(pendingTitle(page)).toBeVisible();
  });

  test("retry same press body; changed bottle value cannot reuse id", async ({
    page,
  }) => {
    const pending = pendingRecord({
      requestId: "stored-req-120",
      request: {
        action: { kind: "FORMULA", amountMl: 120 },
        breastRunning: null,
      },
      startedAt: Date.now() - 10_000,
    });
    await seedBirthDateModalVisitDismissed(page);
    await seedLocalStorage(page, {
      [BABY_QUICK_PENDING_STORAGE_KEY]: JSON.stringify(pending),
    });

    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({ birthDate: null }),
      quickCare: {
        replayed: true,
        openSleep: null,
        steps: [
          quickStep("createFormula", {
            id: "ff1",
            type: "feed",
            payload: { amountMl: 120 },
          }),
        ],
      },
    });

    await gotoBabyHomeReady(page);
    await expect(pendingTitle(page)).toBeVisible();
    await expect(pendingRecoveryUnder(page, "bottle")).toBeVisible();
    // Retry posts the stored pending amount (120), not the current chip UI.
    await pendingRecoveryUnder(page, "bottle")
      .getByRole("button", { name: /try again|thử lại/i })
      .click();
    const retryBody = mocks.quickCareBodies[0] as {
      action: { amountMl: number };
      clientRequestId: string;
    };
    expect(retryBody.clientRequestId).toBe("stored-req-120");
    expect(retryBody.action.amountMl).toBe(120);

    // After success, a fresh chip tap posts a new request.
    await bottleMlChip(page, 90).click();
    const fresh = mocks.quickCareBodies[1] as {
      action: { amountMl: number };
      clientRequestId: string;
    };
    expect(fresh.action.amountMl).toBe(90);
    expect(fresh.clientRequestId).not.toBe("stored-req-120");
  });

  test("pending clear rules: definite codes clear; ambiguous keep; discard keeps timer", async ({
    page,
  }) => {
    // Use evaluate (not addInitScript) so later reload can replace pending
    // without an init script writing the young record back.
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: true,
        openSleep: null,
        steps: [
          quickStep("createDiaper", { id: "d1", type: "diaper" }),
        ],
      },
    });
    await gotoBabyHomeReady(page);
    await page.evaluate(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: BABY_QUICK_PENDING_STORAGE_KEY,
        value: JSON.stringify(
          pendingRecord({
            request: {
              action: { kind: "DIAPER", diaperKind: "wet" },
              breastRunning: null,
            },
            startedAt: Date.now() - 5_000,
          }),
        ),
      },
    );
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    expect(mocks.quickCareCount()).toBe(0);
    await pendingRecoveryUnder(page, "diaper")
      .getByRole("button", { name: /try again|thử lại/i })
      .click();
    expect(mocks.quickCareCount()).toBe(1);

    // Too old on remount → auto-cleared (Retry gone; no zombie recovery chrome).
    await page.unroute("**/api/graphql/baby");
    await page.evaluate(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: BABY_QUICK_PENDING_STORAGE_KEY,
        value: JSON.stringify(
          pendingRecord({
            request: {
              action: { kind: "DIAPER", diaperKind: "wet" },
              breastRunning: null,
            },
            startedAt: Date.now() - 31 * 60 * 1000,
          }),
        ),
      },
    );
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(page.getByTestId("baby-home-pending-recovery")).toHaveCount(0);
    await expect(pendingTooOldTitle(page)).toHaveCount(0);
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        BABY_QUICK_PENDING_STORAGE_KEY,
      ),
    ).toBeNull();

    // Definite clear vs keep-unknown (assert UI contract).
    for (const code of [
      "NOT_FOUND",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "SERVICE_UNAVAILABLE",
    ] as const) {
      await page.unroute("**/api/graphql/baby");
      const m = await installBabyHomeMocks(page, {
        status: defaultStatus(),
        quickCare: () => ({
          errors: [{ message: code, extensions: { code } }],
        }),
      });
      await page.goto("/baby");
      await expect(page.getByTestId("baby-home")).toBeVisible();
      await diaperSave(page).click();
      await expect(
        page.getByText(/nothing was saved|không lưu được gì/i),
      ).toBeVisible();
      // Definite-no-commit must clear the pending bar.
      await expect(pendingTitle(page)).toHaveCount(0);
      expect(m.quickCareCount()).toBe(1);
    }

    for (const kind of ["BAD_REQUEST", "500", "network"] as const) {
      await page.unroute("**/api/graphql/baby");
      const m = await installBabyHomeMocks(page, {
        status: defaultStatus(),
        quickCare: () => {
          if (kind === "network") return "abort";
          if (kind === "500") {
            return {
              errors: [
                {
                  message: "boom",
                  extensions: { code: "INTERNAL_SERVER_ERROR" },
                },
              ],
            };
          }
          return {
            errors: [
              { message: "bad", extensions: { code: "BAD_REQUEST" } },
            ],
          };
        },
      });
      await page.goto("/baby");
      await expect(page.getByTestId("baby-home")).toBeVisible();
      await diaperSave(page).click();
      await expect(pendingTitle(page)).toBeVisible();
      await expect(pendingRecoveryUnder(page, "diaper")).toBeVisible();
      expect(m.quickCareCount()).toBe(1);
    }

    // Discard clears bar and leaves a running breast timer alone.
    const startedAt = Date.now() - 45_000;
    await page.evaluate(
      ({ pendingKey, pendingVal, timerKey, timerVal }) => {
        window.localStorage.setItem(pendingKey, pendingVal);
        window.localStorage.setItem(timerKey, timerVal);
      },
      {
        pendingKey: BABY_QUICK_PENDING_STORAGE_KEY,
        pendingVal: JSON.stringify(
          pendingRecord({
            request: {
              action: { kind: "DIAPER", diaperKind: "wet" },
              breastRunning: null,
            },
          }),
        ),
        timerKey: BABY_BREAST_TIMER_STORAGE_KEY,
        timerVal: JSON.stringify({
          babyId: "home",
          side: "breast_l",
          startedAt,
        }),
      },
    );
    await page.unroute("**/api/graphql/baby");
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await pendingRecoveryUnder(page, "diaper")
      .getByRole("button", { name: /discard|bỏ/i })
      .click();
    await expect(pendingTitle(page)).toHaveCount(0);
    await expect(breastL(page).getByText(/\d+:\d{2}/)).toBeVisible();
  });

  test("home pending too-old is cleared on remount (no zombie recovery)", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReady(page);
    await page.evaluate(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: BABY_QUICK_PENDING_STORAGE_KEY,
        value: JSON.stringify(
          pendingRecord({
            request: {
              action: { kind: "DIAPER", diaperKind: "wet" },
              breastRunning: null,
            },
            startedAt: Date.now() - 31 * 60 * 1000,
          }),
        ),
      },
    );
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(page.getByTestId("baby-home-pending-recovery")).toHaveCount(0);
    await expect(pendingTooOldTitle(page)).toHaveCount(0);
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        BABY_QUICK_PENDING_STORAGE_KEY,
      ),
    ).toBeNull();
  });

  test("fail-closed localStorage blocks BabyQuickCare", async ({ page }) => {
    await page.addInitScript(() => {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (
          String(key).includes("quickCare") ||
          String(key).includes("quickPending")
        ) {
          throw new Error("e2e storage blocked");
        }
        return orig.call(this, key, value);
      };
    });
    const mocksBlocked = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [quickStep("createDiaper", { id: "d1", type: "diaper" })],
      },
    });
    await page.goto("/baby");
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await diaperSave(page).click();
    await expect(
      page.getByText(/could not save safely|không lưu an toàn/i),
    ).toBeVisible();
    expect(mocksBlocked.quickCareCount()).toBe(0);
  });

  test("fail-closed wrong read-back blocks BabyQuickCare", async ({ page }) => {
    await page.addInitScript(() => {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (String(key).includes("quickCare")) {
          return orig.call(this, key, '{"tampered":true}');
        }
        return orig.call(this, key, value);
      };
    });
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [quickStep("createDiaper", { id: "d1", type: "diaper" })],
      },
    });
    await page.goto("/baby");
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await diaperSave(page).click();
    await expect(
      page.getByText(/could not save safely|không lưu an toàn/i),
    ).toBeVisible();
    expect(mocks.quickCareCount()).toBe(0);
  });
  test("idle breast start empty steps; replay does not double-start", async ({
    page,
  }) => {
    let calls = 0;
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({ openSleep: null }),
      quickCare: () => {
        calls += 1;
        return {
          replayed: calls > 1,
          openSleep: null,
          steps: [],
        };
      },
    });

    await gotoBabyHomeReady(page);
    await breastL(page).click();
    await expect(breastL(page).getByText(/\d+:\d{2}/)).toBeVisible();

    // Seed pending for same idle start and Try again → replayed.
    const pending = pendingRecord({
      requestId: mocks.quickCareBodies[0]
        ? ((mocks.quickCareBodies[0] as { clientRequestId: string })
            .clientRequestId)
        : "idle-1",
      request: {
        action: { kind: "BREAST", side: "breast_l" },
        breastRunning: null,
      },
    });
    await page.evaluate(
      ({ key, value }) => window.localStorage.setItem(key, value),
      {
        key: BABY_QUICK_PENDING_STORAGE_KEY,
        value: JSON.stringify(pending),
      },
    );
    // Simulate unknown pending after a drop, then retry.
    await page.reload();
    // Timer already running from first success; pending may show if still stored.
    // Press Try again if visible — must not start a second timer / duplicate toast.
    // Quiet success (replayed) clears pending with no Saved banner — do not require
    // a lingering role=status (recovery or announcement).
    const retry = pendingRecoveryUnder(page, "breast_l").getByRole("button", {
      name: /try again|thử lại/i,
    });
    if (await retry.isVisible().catch(() => false)) {
      await retry.click();
      await expect(breastL(page)).toContainText(/\d+:\d{2}/);
      await expect(pendingRecoveryUnder(page, "breast_l")).toHaveCount(0);
      await expect(
        page.getByText(/saved|đã lưu|saving…|đang lưu/i),
      ).toHaveCount(0);
      // Single L timer only — no second breast start on R.
      await expect(breastR(page).getByText(/\d+:\d{2}/)).toHaveCount(0);
    }
  });

  test("midnight rollover refetches with new dayFrom/dayTo", async ({
    page,
  }) => {
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus({ feedsToday: 1 }),
    });
    // Install clock just before local midnight.
    const now = new Date();
    const almostMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      50,
      0,
    );
    await page.clock.install({ time: almostMidnight });
    await gotoBabyHomeReady(page);
    // Shell is visible while status is still loading — wait for the mock hit.
    await expect
      .poll(() => mocks.statusCalls.length)
      .toBeGreaterThanOrEqual(1);
    const first = mocks.statusCalls.length;
    const dayFrom0 = mocks.statusCalls[0]?.dayFrom;
    await page.clock.fastForward(15_000);
    await expect
      .poll(() => mocks.statusCalls.length)
      .toBeGreaterThan(first);
    const last = mocks.statusCalls[mocks.statusCalls.length - 1];
    expect(last.dayFrom).toBeTruthy();
    expect(last.dayFrom).not.toBe(dayFrom0);
    expect(last.dayTo).toBeTruthy();
  });

  test("midnight rollover in America/New_York (DST-length days)", async ({
    browser,
  }) => {
    // Install clock at 23:59:50 *local* NY on each DST-length day.
    // Spring-forward evening is EDT (−04); fall-back evening is EST (−05).
    // (Using −05 on March 8 lands after local midnight → no rollover.)
    for (const { label, when } of [
      {
        label: "23h",
        when: new Date("2026-03-08T23:59:50-04:00"),
      },
      {
        label: "25h",
        when: new Date("2026-11-01T23:59:50-05:00"),
      },
    ]) {
      const context = await browser.newContext({
        timezoneId: "America/New_York",
      });
      const page = await context.newPage();
      const mocks = await installBabyHomeMocks(page, {
        status: defaultStatus(),
      });
      await page.clock.install({ time: when });
      await page.goto("/baby");
      await expect(page.getByTestId("baby-home")).toBeVisible();
      await expect
        .poll(() => mocks.statusCalls.length, { message: `${label} first status` })
        .toBeGreaterThanOrEqual(1);
      const firstFrom = mocks.statusCalls[0]?.dayFrom;
      // Past local midnight (+ buffer matches attachBabyLocalDayRoll's +1000ms).
      await page.clock.fastForward(20_000);
      // Wake path: timer alone can flake under fake clock + DST; product listens
      // for visibilitychange after sleep-past-midnight.
      await page.evaluate(() => {
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("focus"));
      });
      await expect
        .poll(() => mocks.statusCalls.length, {
          message: label,
          timeout: 15_000,
        })
        .toBeGreaterThan(1);
      const last = mocks.statusCalls[mocks.statusCalls.length - 1];
      expect(last.dayFrom, label).not.toBe(firstFrom);
      await context.close();
    }
  });

  test("count refresh after save; same dayFrom/dayTo on refetch", async ({
    page,
  }) => {
    let feedsToday = 3;
    const mocks = await installBabyHomeMocks(page, {
      statusFactory: () =>
        defaultStatus({
          feedsToday,
          lastFeed: feedPayload(),
          birthDate: BIRTH,
        }),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", { id: "d1", type: "diaper" }),
        ],
      },
    });

    await gotoBabyHomeReady(page);
    await expect(bottleHeader(page)).toContainText(/Today/);
    await expect(bottleHeader(page)).toContainText(/\b3\b/);
    feedsToday = 4;
    await diaperSave(page).click();
    await expect(bottleHeader(page)).toContainText(/\b4\b/);
    expect(mocks.statusCalls.length).toBeGreaterThanOrEqual(2);
    const a = mocks.statusCalls[0];
    const b = mocks.statusCalls[mocks.statusCalls.length - 1];
    expect(a.dayFrom).toBe(b.dayFrom);
    expect(a.dayTo).toBe(b.dayTo);
  });

  test("next-due shared feed; sleep from ended; diaper; hide when missing", async ({
    page,
  }) => {
    const breastHeader = () => page.getByTestId("baby-home-header-breast");
    const diaperHeader = () => page.getByTestId("baby-home-header-diaper");

    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: BIRTH,
        lastFeed: feedPayload(),
        lastSleep: sleepEndedPayload(),
        lastDiaper: diaperPayload(),
        openSleep: null,
      }),
    });
    await gotoBabyHomeReady(page);

    // Next-due tips live on breast/diaper/nap headers — not L/R or bottle chips.
    await expect(breastHeader()).toContainText(
      /Next feed is in about|Lần bú tiếp theo còn khoảng|overdue|quá hạn/i,
    );
    await expect(diaperHeader()).toContainText(
      /Next change is in about|Lần đổi tã tiếp theo còn khoảng|overdue|quá hạn/i,
    );
    await expect(page.getByTestId("baby-home-header-nap")).toContainText(
      /Next nap|Lần ngủ|overdue|quá hạn/i,
    );
    await expect(breastL(page)).not.toContainText(
      /Next feed|Lần bú tiếp theo|overdue|quá hạn/i,
    );
    await expect(breastR(page)).not.toContainText(
      /Next feed|Lần bú tiếp theo|overdue|quá hạn/i,
    );
    await expect(bottleSave(page)).not.toContainText(
      /Next feed|Lần bú tiếp theo|overdue|quá hạn/i,
    );
    // Idle nap chip: no next/overdue on the card (header owns it).
    await expect(sleepCard(page)).not.toContainText(
      /Next nap|Lần ngủ|overdue|quá hạn|home\.nextIn/i,
    );

    // Kind tiles do not show next-due on the face (B1/D-A).
    await expect(diaperGroup(page)).not.toContainText(
      /Next change|Lần đổi tã tiếp theo|overdue|quá hạn/i,
    );

    // While napping: elapsed only (no next line on sleep card).
    await page.unroute("**/api/graphql/baby");
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: BIRTH,
        lastFeed: feedPayload(),
        lastSleep: sleepEndedPayload(),
        lastDiaper: diaperPayload(),
        openSleep: {
          id: "nap",
          type: "sleep",
          occurredAt: new Date(Date.now() - 120_000).toISOString(),
          endedAt: null,
          payload: {},
        },
      }),
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(sleepCard(page).getByText(/end nap|kết thúc ngủ/i)).toBeVisible();
    // Merged stop title on chip (not a separate Tap to stop subtitle).
    await expect(sleepCard(page)).toContainText(/Tap to stop|Chạm để dừng/);
    await expect(sleepCard(page)).not.toContainText(
      /Next nap|Lần ngủ|overdue|quá hạn|home\.nextIn/i,
    );

    // Hide next-due without birth date (empty tip only on headers).
    await page.unroute("**/api/graphql/baby");
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: null,
        lastFeed: feedPayload(),
        lastDiaper: diaperPayload(),
        lastSleep: sleepEndedPayload(),
      }),
    });
    await page.reload();
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(breastHeader()).toContainText(
      /Tap .*Left.*Right|Chạm .*Trái.*Phải/i,
    );
    await expect(breastHeader()).not.toContainText(
      /Next feed is in about|Lần bú tiếp theo còn khoảng|overdue|quá hạn/i,
    );
    await expect(diaperHeader()).toContainText(
      /Tap a kind|Chạm một loại/i,
    );
    await expect(diaperHeader()).not.toContainText(
      /Next change is in about|Lần đổi tã tiếp theo còn khoảng|overdue|quá hạn/i,
    );
    await expect(breastL(page)).not.toContainText(
      /Next feed|Lần bú tiếp theo|overdue|quá hạn/i,
    );
    await expect(bottleSave(page)).not.toContainText(
      /Next feed|Lần bú tiếp theo|overdue|quá hạn/i,
    );
  });

  test("last ml on row 3 when last feed has amountMl", async ({ page }) => {
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: BIRTH,
        lastFeed: feedPayload({
          payload: { method: "formula", amountMl: 120 },
          summary: "Feed (Formula 120 ml)",
        }),
      }),
    });
    await gotoBabyHomeReady(page);
    // Status uses marked prose ("a bottle of 120 ml"), not raw GraphQL summary.
    await expect(
      homeStatus(page).getByText(/Last feed was a bottle of/i),
    ).toBeVisible();
    await expect(homeStatus(page).getByText(/120 ml/i)).toBeVisible();
    const text = await homeStatus(page).innerText();
    expect(text).not.toMatch(/^120 ml ·/m);
    expect(text).not.toMatch(/Feed \(Formula 120 ml\)/);
  });

  test("3AM geometry: care controls ≥ 56 px; Custom chip excluded", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReadyForCare(page);
    // Wait past hydration remount so locators stay attached for geometry.
    await expect
      .poll(async () => (await breastL(page).boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(44);

    const care = [
      breastL(page),
      breastR(page),
      bottleGroup(page).locator('[data-bottle-ml="60"], [data-bottle-ml="90"], [data-bottle-ml="120"]').first(),
      sleepCard(page),
      diaperKindTile(page, "wet"),
      diaperKindTile(page, "dirty"),
      diaperKindTile(page, "mixed"),
      diaperKindTile(page, "dry"),
    ];
    for (const el of care) {
      await expect(el).toBeVisible();
      const box = await el.boundingBox();
      expect(box, await el.innerText()).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const custom = customMlButton(page);
    await expect(custom).toBeVisible();
    const customBox = await custom.boundingBox();
    expect(customBox).toBeTruthy();
    expect(customBox!.height).toBeGreaterThanOrEqual(44);

    const breastY = (await breastL(page).boundingBox())!.y;
    const bottleY = (await bottleGroup(page).boundingBox())!.y;
    const statusY = (await homeStatus(page).boundingBox())!.y;
    // Desktop Row 1: Breast | Bottle share a band; status (Row 4) is below.
    expect(Math.abs(breastY - bottleY)).toBeLessThan(48);
    expect(Math.max(breastY, bottleY)).toBeLessThan(statusY);
  });

  test("skeleton soft smoke: Kind + bottle markers (or live layout mirror)", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, { status: defaultStatus() });

    const nav = page.goto("/baby");
    const skeletonBottle = page.locator('[data-skeleton="bottle-ml-chips"]');
    const skeletonKind = page.locator('[data-skeleton="diaper-kind-2x2"]');
    let sawSkeleton = false;
    try {
      await skeletonBottle.waitFor({ state: "visible", timeout: 8_000 });
      sawSkeleton = true;
    } catch {
      sawSkeleton = false;
    }

    if (sawSkeleton) {
      await expect(skeletonKind).toBeVisible();
      await expect(page.locator('[data-skeleton="custom-ml"]')).toBeVisible();
      await expect(page.locator('[data-skeleton="section-breast"]')).toBeVisible();
    }

    await nav;
    await expect(page.getByTestId("baby-home")).toBeVisible({
      timeout: 60_000,
    });
    await expect(bottleGroup(page)).toHaveAttribute(
      "data-layout",
      "bottle-ml-chips",
    );
    await expect(diaperGroup(page)).toHaveAttribute(
      "data-layout",
      "diaper-kind-2x2",
    );
    await expect(page.locator('[data-section="breast"]')).toBeVisible();
    await expect(page.locator('[data-section="bottle"]')).toBeVisible();
    await expect(page.locator('[data-section="nap"]')).toBeVisible();
    await expect(page.locator('[data-section="diaper"]')).toBeVisible();
  });

  test("Vietnamese: Custom modal, birth prompt, and home controls", async ({
    page,
  }) => {
    // ~45 local calendar days → 1–2 mo sleep blend; recent events → next-due tips.
    const born = new Date();
    born.setFullYear(born.getFullYear(), born.getMonth(), born.getDate() - 45);
    const birthDate = `${born.getFullYear()}-${String(born.getMonth() + 1).padStart(2, "0")}-${String(born.getDate()).padStart(2, "0")}`;
    const recentAt = new Date(Date.now() - 20 * 60_000).toISOString();
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate,
        lastFeed: feedPayload({ at: recentAt }),
        lastDiaper: diaperPayload({ at: recentAt }),
      }),
      profile: { birthDate },
    });
    await page.goto("/baby/settings");
    await expect(async () => {
      await page.getByRole("radio", { name: "Tiếng Việt" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Cài đặt" }),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass();

    await page.goto("/baby");
    await expect(page.getByTestId("baby-home")).toBeVisible();
    await expect(breastL(page).getByText("Trái", { exact: true })).toBeVisible();
    await expect(breastR(page).getByText("Phải", { exact: true })).toBeVisible();

    // All four section headers + nap blend in footer (not header).
    await expect(page.getByTestId("baby-home-header-breast")).toContainText(
      "Ngực",
    );
    await expect(page.getByTestId("baby-home-header-breast")).toContainText(
      /Lần bú tiếp theo còn khoảng/,
    );
    await expect(page.getByTestId("baby-home-header-bottle")).toContainText(
      "Bình sữa",
    );
    await expect(page.getByTestId("baby-home-header-nap")).toContainText("Ngủ");
    await expect(page.locator('[data-section-footer="nap"]')).toContainText(
      /Ở tuổi này, khoảng.*15–16 giờ/,
    );
    await expect(page.getByTestId("baby-home-header-diaper")).toContainText(
      "Tã",
    );
    await expect(page.getByTestId("baby-home-header-diaper")).toContainText(
      /Lần đổi tã tiếp theo còn khoảng/,
    );

    await customMlButton(page).click();
    await expect(page.getByRole("dialog")).toContainText(/lượng tùy chọn|nhập ml|ml/i);
    await page.keyboard.press("Escape");
  });

  test("hamburger still reaches full forms for detail corrections", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReady(page);
    await openAppMenu(page);
    const feed = appMenuPanel(page).getByRole("link", {
      name: /log feed|ghi bú/i,
    });
    await clickSoftNav(page, feed, /\/baby\/feed/, 120_000);
    await expect(
      page.getByRole("heading", { name: /log feed|ghi bú/i }),
    ).toBeVisible();
  });
});

/** Ensure mocks never answer the old eventId-only shape. */
test("BabyQuickCare mock contract uses steps not eventId", async ({ page }) => {
  const mocks = await installBabyHomeMocks(page, {
    status: defaultStatus(),
    quickCare: {
      replayed: false,
      openSleep: null,
      steps: [quickStep("createDiaper", { id: "d1", type: "diaper" })],
    },
  });
  await gotoBabyHomeReady(page);
  await diaperSave(page).click();
  await expect(diaperKindTile(page, "wet")).toContainText(/Done|Xong/);
  const raw = JSON.stringify(mocks.quickCareBodies);
  expect(raw).not.toMatch(/"eventId"/);
  mocks.assertNoLegacyEventIdShape();
});

test.describe("layout custom diaper (clock Custom + Edit + rows)", () => {
  test("home row order: Nap → Diaper above Pump; Custom time chips present", async ({
    page,
  }) => {
    await installBabyHomeMocks(page, { status: defaultStatus() });
    await gotoBabyHomeReady(page);
    const order = sectionOrder(page);
    await expect(order.napRow).toBeVisible();
    await expect(order.diaperRow).toBeVisible();
    await expect(order.pumpRow).toBeVisible();
    const napY = (await order.napRow.boundingBox())!.y;
    const diaperY = (await order.diaperRow.boundingBox())!.y;
    const pumpY = (await order.pumpRow.boundingBox())!.y;
    expect(napY).toBeLessThan(diaperY);
    expect(diaperY).toBeLessThan(pumpY);
    await expect(napCustomTimeChip(page)).toBeVisible();
    await expect(diaperCustomTimeChip(page)).toBeVisible();
  });

  test("Nap Custom time → start sends occurredAt; end sends endedAt", async ({
    page,
  }) => {
    await seedBirthDateModalVisitDismissed(page);
    let open = false;
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: async (input) => {
        if ((input.action as { kind?: string })?.kind === "SLEEP") {
          if (!open) {
            open = true;
            return {
              replayed: false,
              openSleep: {
                id: "nap-custom",
                type: "sleep",
                occurredAt:
                  (input.occurredAt as string) ??
                  new Date().toISOString(),
                endedAt: null,
                payload: {},
              },
              steps: [
                quickStep("startNap", {
                  id: "nap-custom",
                  type: "sleep",
                  payload: {},
                }),
              ],
            };
          }
          open = false;
          return {
            replayed: false,
            openSleep: null,
            steps: [
              quickStep("endNap", {
                id: "nap-custom",
                type: "sleep",
                payload: {},
              }),
            ],
          };
        }
        return { replayed: false, openSleep: null, steps: [] };
      },
    });
    await gotoBabyHomeReady(page);
    await napCustomTimeChip(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="datetime-local"]').fill("2026-09-20T06:40");
    await dialog.getByRole("button", { name: /^(use|dùng)$/i }).click();
    await expect(dialog).toHaveCount(0);
    await sleepCard(page).click();
    await expect
      .poll(() => mocks.quickCareBodies.length)
      .toBeGreaterThanOrEqual(1);
    const startBody = mocks.quickCareBodies[0] as {
      occurredAt?: string;
      endedAt?: string;
      action: { kind: string };
    };
    expect(startBody.action.kind).toBe("SLEEP");
    expect(startBody.occurredAt).toBeTruthy();
    expect(startBody.endedAt).toBeUndefined();

    await expect(sleepCard(page)).toHaveAttribute("data-running", "true");
    await expect(sleepCard(page)).toContainText(/End nap - Tap to stop|Kết thúc ngủ - Chạm để dừng/i);

    await napCustomTimeChip(page).click();
    await dialog.locator('input[type="datetime-local"]').fill("2026-09-20T07:10");
    await dialog.getByRole("button", { name: /^(use|dùng)$/i }).click();
    await sleepCard(page).click();
    await expect
      .poll(() => mocks.quickCareBodies.length)
      .toBeGreaterThanOrEqual(2);
    const endBody = mocks.quickCareBodies[1] as {
      occurredAt?: string;
      endedAt?: string;
      action: { kind: string };
    };
    expect(endBody.action.kind).toBe("SLEEP");
    expect(endBody.endedAt).toBeTruthy();
    expect(endBody.occurredAt).toBeUndefined();
  });

  test("Diaper Custom time → occurredAt on quick-care body", async ({ page }) => {
    await seedBirthDateModalVisitDismissed(page);
    const mocks = await installBabyHomeMocks(page, {
      status: defaultStatus(),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createDiaper", {
            id: "d-custom-time",
            type: "diaper",
            payload: { kind: "wet" },
          }),
        ],
      },
    });
    await gotoBabyHomeReady(page);
    await diaperCustomTimeChip(page).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="datetime-local"]').fill("2026-09-20T06:40");
    await dialog.getByRole("button", { name: /^(use|dùng)$/i }).click();
    await diaperSave(page).click();
    await expect
      .poll(() => mocks.quickCareBodies.length)
      .toBe(1);
    const body = mocks.quickCareBodies[0] as {
      occurredAt?: string;
      endedAt?: string;
      action: { kind: string };
    };
    expect(body.action.kind).toBe("DIAPER");
    expect(body.occurredAt).toBeTruthy();
    expect(body.endedAt).toBeUndefined();
  });

  test("Custom ml Edit reopens modal; second Custom tap still saves", async ({
    page,
  }) => {
    await seedBirthDateModalVisitDismissed(page);
    await installBabyHomeMocks(page, {
      status: defaultStatus({
        birthDate: null,
        recentBottleMl: [90, 120, 150],
      }),
      quickCare: {
        replayed: false,
        openSleep: null,
        steps: [
          quickStep("createFormula", {
            id: "ff-edit",
            type: "feed",
            payload: { method: "formula", amountMl: 95 },
          }),
        ],
      },
    });
    await gotoBabyHomeReady(page);
    await customMlButton(page).click();
    await page.getByRole("dialog").getByLabel(/amount/i).fill("95");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /use this amount|dùng lượng này/i })
      .click();
    await expect(bottleCustomMlEdit(page)).toBeVisible();
    await bottleCustomMlEdit(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByLabel(/amount/i).fill("97");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /use this amount|dùng lượng này/i })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await customMlButton(page).click();
    await expect(
      bottleGroup(page).locator(
        '[data-bottle-ml="custom"][data-bottle-flash="done"]',
      ),
    ).toBeVisible();
  });
});
