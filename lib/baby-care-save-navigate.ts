/** Post-save destination for feed / sleep / diaper capture forms. */
export const BABY_AFTER_CARE_SAVE_HREF = "/baby" as const;

export type BabyCareAfterSave = "stay" | "home";

/**
 * Caller contracts for Gate 2 navigate: Start stays; End / complete / diaper → home.
 * Forms must use these (not raw string literals) so unit tests can lock wiring.
 */
export const BABY_CARE_AFTER_SAVE = {
  feedMethod: "home",
  sleepStart: "stay",
  sleepEnd: "home",
  diaper: "home",
  homeQuick: "stay",
  /** Growth + vaccine on Growth: stay, toast, reset to Weight. */
  growth: "stay",
} as const satisfies Record<string, BabyCareAfterSave>;

type PushRouter = { push: (href: string) => void };

/**
 * Navigate home after a successful care write.
 * Prefer `runBabyCareSaveThenNavigate` so failure paths cannot call this.
 */
export function navigateAfterBabyCareSave(router: PushRouter): void {
  router.push(BABY_AFTER_CARE_SAVE_HREF);
}

type RunBabyCareSaveThenNavigateArgs = {
  mutate: () => Promise<void>;
  onSuccess: () => void | Promise<void>;
  onError: (error: unknown) => void;
  router: PushRouter;
  /** Start → stay; End / complete session / diaper → home (default). */
  afterSave?: BabyCareAfterSave;
  /**
   * Optional pause before home navigate so Done flash can paint.
   * Ignored when afterSave is stay.
   */
  homeNavigateDelayMs?: number;
  /** Injectable delay for unit tests (defaults to globalThis.setTimeout). */
  delayFn?: (ms: number) => Promise<void>;
};

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

/**
 * Run a care mutation, then optionally navigate home on full success.
 * Rejected mutate / onSuccess stays on the form (no router.push).
 */
export async function runBabyCareSaveThenNavigate({
  mutate,
  onSuccess,
  onError,
  router,
  afterSave = "home",
  homeNavigateDelayMs,
  delayFn = defaultDelay,
}: RunBabyCareSaveThenNavigateArgs): Promise<void> {
  try {
    await mutate();
    await onSuccess();
    if (afterSave === "home") {
      if (
        typeof homeNavigateDelayMs === "number" &&
        homeNavigateDelayMs > 0
      ) {
        await delayFn(homeNavigateDelayMs);
      }
      navigateAfterBabyCareSave(router);
    }
  } catch (error) {
    onError(error);
  }
}
