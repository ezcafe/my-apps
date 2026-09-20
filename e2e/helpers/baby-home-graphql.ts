import { expect, type Page, type Route } from "@playwright/test";

/** Shared Baby Care home GraphQL mocks for Option B e2e. */

export type BabyHomeQuickStatusPayload = {
  lastFeed?: Record<string, unknown> | null;
  lastSleep?: Record<string, unknown> | null;
  lastDiaper?: Record<string, unknown> | null;
  lastPump?: Record<string, unknown> | null;
  openSleep?: Record<string, unknown> | null;
  feedsToday?: number;
  birthDate?: string | null;
  latestWeightKg?: number | null;
  recentBottleMl?: number[];
};

export type BabyQuickCareStep = {
  step: string;
  wrote?: "insert" | "update";
  event: {
    id: string;
    type: string;
    occurredAt: string;
    endedAt: string | null;
    payload: unknown;
  };
};

export type BabyQuickCarePayload = {
  replayed?: boolean;
  openSleep?: Record<string, unknown> | null;
  steps?: BabyQuickCareStep[];
};

export type BabyHomeMockOptions = {
  status?: BabyHomeQuickStatusPayload | "error";
  /** Called for each BabyHomeQuickStatus; return payload or "error". */
  statusFactory?: (
    vars: { dayFrom?: string; dayTo?: string },
    callIndex: number,
  ) => BabyHomeQuickStatusPayload | "error";
  /** Static quick-care answer, or per-request factory. */
  quickCare?:
    | BabyQuickCarePayload
    | ((
        body: Record<string, unknown>,
        callIndex: number,
      ) => Promise<BabyQuickCarePayload | "hang" | "abort" | GraphQLErrorBody> | BabyQuickCarePayload | "hang" | "abort" | GraphQLErrorBody);
  profile?: { id?: string; birthDate?: string | null; displayName?: string };
  updateProfile?:
    | { id?: string; birthDate?: string | null }
    | ((
        input: Record<string, unknown>,
      ) =>
        | { id?: string; birthDate?: string | null }
        | GraphQLErrorBody);
};

export type GraphQLErrorBody = {
  errors: Array<{ message: string; extensions?: { code?: string } }>;
};

export type BabyHomeMockHandle = {
  quickCareBodies: Array<Record<string, unknown>>;
  quickCareCount: () => number;
  statusCalls: Array<{ dayFrom?: string; dayTo?: string }>;
  /** Assert every BabyQuickCare response used `steps`, never a bare eventId. */
  assertNoLegacyEventIdShape: () => void;
};

function isOp(body: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(body);
}

function parseBody(raw: string | null): {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
} {
  if (!raw) return { query: "" };
  try {
    return JSON.parse(raw) as {
      query: string;
      variables?: Record<string, unknown>;
      operationName?: string;
    };
  } catch {
    return { query: raw };
  }
}

function careEvent(
  partial: Partial<BabyQuickCareStep["event"]> & { id: string; type: string },
): BabyQuickCareStep["event"] {
  return {
    id: partial.id,
    type: partial.type,
    occurredAt: partial.occurredAt ?? "2026-09-12T10:00:00.000Z",
    endedAt: partial.endedAt ?? null,
    payload: partial.payload ?? {},
  };
}

export function quickStep(
  step: string,
  event: Partial<BabyQuickCareStep["event"]> & { id: string; type: string },
  wrote: "insert" | "update" = "insert",
): BabyQuickCareStep {
  return { step, wrote, event: careEvent(event) };
}

export function defaultStatus(
  overrides: BabyHomeQuickStatusPayload = {},
): BabyHomeQuickStatusPayload {
  return {
    lastFeed: null,
      lastPump: null,
    lastSleep: null,
    lastDiaper: null,
    openSleep: null,
    feedsToday: 0,
    birthDate: "2026-07-01",
    recentBottleMl: [],
    ...overrides,
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * Install Baby home GraphQL route mocks.
 * Continues unmatched ops so other baby pages still work.
 */
export async function installBabyHomeMocks(
  page: Page,
  options: BabyHomeMockOptions = {},
): Promise<BabyHomeMockHandle> {
  const quickCareBodies: Array<Record<string, unknown>> = [];
  const statusCalls: Array<{ dayFrom?: string; dayTo?: string }> = [];
  let statusIndex = 0;
  let quickIndex = 0;
  let sawLegacyEventId = false;

  await page.route("**/api/graphql/baby", async (route) => {
    const parsed = parseBody(route.request().postData());
    const bodyText = parsed.query ?? "";
    const op =
      parsed.operationName ??
      (isOp(bodyText, "BabyHomeQuickStatus")
        ? "BabyHomeQuickStatus"
        : isOp(bodyText, "BabyQuickCare")
          ? "BabyQuickCare"
          : isOp(bodyText, "UpdateBabyProfile")
            ? "UpdateBabyProfile"
            : isOp(bodyText, "BabyProfile")
              ? "BabyProfile"
              : null);

    if (op === "BabyHomeQuickStatus" || isOp(bodyText, "babyHomeQuickStatus")) {
      const vars = (parsed.variables ?? {}) as {
        dayFrom?: string;
        dayTo?: string;
      };
      statusCalls.push(vars);
      const idx = statusIndex++;
      const raw =
        options.statusFactory?.(vars, idx) ??
        options.status ??
        defaultStatus();
      if (raw === "error") {
        await fulfillJson(route, {
          errors: [{ message: "e2e forced home status error" }],
        });
        return;
      }
      await fulfillJson(route, {
        data: {
          babyHomeQuickStatus: {
            lastFeed: raw.lastFeed ?? null,
            lastSleep: raw.lastSleep ?? null,
            lastDiaper: raw.lastDiaper ?? null,
            openSleep: raw.openSleep ?? null,
            feedsToday: raw.feedsToday ?? 0,
            birthDate: raw.birthDate === undefined ? "2026-07-01" : raw.birthDate,
            latestWeightKg: raw.latestWeightKg ?? null,
            recentBottleMl: raw.recentBottleMl ?? [],
          },
        },
      });
      return;
    }

    if (op === "BabyQuickCare" || isOp(bodyText, "babyQuickCare")) {
      const input = (parsed.variables?.input ?? {}) as Record<string, unknown>;
      // Fail the suite if a mock still uses the old eventId contract.
      const rawText = route.request().postData() ?? "";
      if (/"eventId"\s*:/.test(rawText) && !/"steps"\s*:/.test(rawText)) {
        sawLegacyEventId = true;
      }
      quickCareBodies.push(input);
      const idx = quickIndex++;
      const configured = options.quickCare ?? {
        replayed: false,
        openSleep: null,
        steps: [],
      };
      const result =
        typeof configured === "function"
          ? await configured(input, idx)
          : configured;

      if (result === "hang") {
        // Leave the request open so pending can be inspected after reload.
        return;
      }
      if (result === "abort") {
        await route.abort("failed");
        return;
      }
      if ("errors" in result) {
        await fulfillJson(route, result);
        return;
      }
      const payload = result as BabyQuickCarePayload;
      if (
        payload &&
        typeof payload === "object" &&
        "eventId" in (payload as object) &&
        !("steps" in (payload as object))
      ) {
        sawLegacyEventId = true;
      }
      await fulfillJson(route, {
        data: {
          babyQuickCare: {
            replayed: payload.replayed ?? false,
            openSleep: payload.openSleep === undefined ? null : payload.openSleep,
            steps: payload.steps ?? [],
          },
        },
      });
      return;
    }

    if (op === "BabyProfile" || isOp(bodyText, "babyProfile")) {
      const p = options.profile ?? {};
      await fulfillJson(route, {
        data: {
          babyProfile: {
            id: p.id ?? "e2e-baby-1",
            workspaceId: "e2e-ws",
            displayName: p.displayName ?? "E2E Baby",
            birthDate: p.birthDate === undefined ? null : p.birthDate,
          },
        },
      });
      return;
    }

    // Settings page also loads telegram link — keep it quiet without auth.
    if (
      op === "BabyTelegramLink" ||
      isOp(bodyText, "babyTelegramLink")
    ) {
      await fulfillJson(route, {
        data: { babyTelegramLink: null },
      });
      return;
    }

    if (op === "UpdateBabyProfile" || isOp(bodyText, "updateBabyProfile")) {
      const input = (parsed.variables?.input ?? {}) as Record<string, unknown>;
      const configured = options.updateProfile ?? {
        id: "e2e-baby-1",
        birthDate: (input.birthDate as string | null) ?? null,
      };
      const result =
        typeof configured === "function" ? configured(input) : configured;
      if ("errors" in result) {
        await fulfillJson(route, result);
        return;
      }
      await fulfillJson(route, {
        data: {
          updateBabyProfile: {
            id: result.id ?? "e2e-baby-1",
            birthDate: result.birthDate ?? null,
          },
        },
      });
      return;
    }

    await route.continue();
  });

  return {
    quickCareBodies,
    quickCareCount: () => quickCareBodies.length,
    statusCalls,
    assertNoLegacyEventIdShape: () => {
      expect(sawLegacyEventId).toBe(false);
    },
  };
}

/** Mirrors `BABY_BIRTH_DATE_PROMPT_VISIT_KEY` — keep e2e free of `@/` imports. */
export const BABY_BIRTH_DATE_PROMPT_VISIT_KEY =
  "baby.birthDatePrompt.dismissedThisVisit";

/**
 * Seed visit dismiss before navigation so the birthday modal never opens.
 * Use when status `birthDate` is null but the test must click care controls.
 */
export async function seedBirthDateModalVisitDismissed(page: Page) {
  await page.addInitScript((key: string) => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }, BABY_BIRTH_DATE_PROMPT_VISIT_KEY);
}

/**
 * Click Not now when the birthday modal is open (status ready + null birthDate).
 * Native dialog showModal() marks the page inert — clicks and boundingBox fail until closed.
 */
export async function dismissBabyBirthDateModalIfOpen(page: Page) {
  const modal = page.getByTestId("baby-birth-date-modal");
  if (!(await modal.isVisible().catch(() => false))) return;
  await page.getByRole("button", { name: /not now|để sau/i }).click();
  await expect(modal).toHaveCount(0);
}

export async function gotoBabyHomeReady(page: Page) {
  await page.goto("/baby");
  await expect(page.getByTestId("baby-home")).toBeVisible({ timeout: 60_000 });
}

/** Home ready + birthday modal dismissed so care chips are clickable / measurable. */
export async function gotoBabyHomeReadyForCare(page: Page) {
  await gotoBabyHomeReady(page);
  await dismissBabyBirthDateModalIfOpen(page);
}

export function breastL(page: Page) {
  return page.locator('button[aria-labelledby="baby-breast-breast_l"]');
}

export function breastR(page: Page) {
  return page.locator('button[aria-labelledby="baby-breast-breast_r"]');
}

export function pumpL(page: Page) {
  return page.locator('button[aria-labelledby="baby-pump-pump_l"]');
}

export function pumpR(page: Page) {
  return page.locator('button[aria-labelledby="baby-pump-pump_r"]');
}

export function pumpAmountGroup(page: Page) {
  return page.locator('[data-section="pump-amount"] [data-layout="bottle-ml-chips"]');
}

export function pumpAmountMlChip(page: Page, ml: number) {
  return page.locator(
    `[data-section="pump-amount"] [data-bottle-ml="${ml}"]`,
  );
}

export function bottleGroup(page: Page) {
  return page.locator('[data-section="bottle"] [data-layout="bottle-ml-chips"]');
}

/** First ml chip in the Kind-like row (replaces old face save). */
export function bottleSave(page: Page) {
  return bottleGroup(page).locator('button[data-bottle-ml]:not([data-bottle-ml="custom"])').first();
}

export function bottleMlChip(page: Page, ml: number) {
  return bottleGroup(page).locator(`[data-bottle-ml="${ml}"]`);
}

/** @deprecated Face ± removed — chips only. Kept so old imports fail loudly at call sites. */
export function bottleMore(page: Page) {
  return page.getByRole("button", { name: /more ml|thêm ml/i });
}

/** @deprecated Face ± removed — chips only. */
export function bottleLess(page: Page) {
  return page.getByRole("button", { name: /less ml|bớt ml/i });
}

export function customMlButton(page: Page) {
  return page.locator(
    '[data-section="bottle"] [data-bottle-ml="custom"]',
  );
}

export function pumpCustomMlButton(page: Page) {
  return page.locator(
    '[data-section="pump-amount"] [data-bottle-ml="custom"]',
  );
}

export function napCustomTimeChip(page: Page) {
  return page.getByTestId("baby-care-chip-nap-custom-time");
}

export function diaperCustomTimeChip(page: Page) {
  return page.getByTestId("baby-care-chip-diaper-custom-time");
}

export function bottleCustomMlEdit(page: Page) {
  return page.locator(
    '[data-section="bottle"] [data-testid="baby-custom-ml-edit"]',
  );
}

export function bottleHeader(page: Page) {
  // Progress / ml tip live in the bottle section footer (header is lead-only when band known).
  return page.locator('[data-section-footer="bottle"]');
}

export function sectionOrder(page: Page) {
  return {
    breast: page.locator('[data-section="breast"]'),
    bottle: page.locator('[data-section="bottle"]'),
    nap: page.locator('[data-section="nap"]'),
    diaper: page.locator('[data-section="diaper"]'),
    pump: page.locator('[data-section="pump"]'),
    napRow: page.locator('[data-layout="home-row-nap"]'),
    diaperRow: page.locator('[data-layout="home-row-diaper"]'),
    pumpRow: page.locator('[data-layout="home-row-pump"]'),
  };
}

export function sleepCard(page: Page) {
  return page.locator('button[aria-labelledby="baby-quick-sleep-label"]');
}

export function diaperGroup(page: Page) {
  return page.locator('[data-layout="diaper-kind-2x2"]');
}

export function diaperKindTile(
  page: Page,
  kind: "wet" | "dirty" | "mixed" | "dry",
) {
  return page.locator(`[data-diaper-kind="${kind}"]`);
}

/** Wet tile — instant save (replaces old centre save on wet). */
export function diaperSave(page: Page) {
  return diaperKindTile(page, "wet");
}

export function homeStatus(page: Page) {
  return page.getByTestId("baby-home-status");
}

export function pendingRetry(page: Page) {
  return page.getByRole("button", { name: /try again|thử lại/i });
}

export function pendingDiscard(page: Page) {
  return page.getByRole("button", { name: /discard|bỏ/i });
}
