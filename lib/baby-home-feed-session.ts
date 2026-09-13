import { adoptFeedSessionAfterQuickCare } from "@/lib/baby-quick-care-plan";
import type { BabyQuickLocalAfter } from "@/lib/baby-quick-care-plan";
import {
  BABY_FEED_SESSION_STORAGE_KEY,
  parseBabyFeedSessionHandle,
  serializeBabyFeedSessionHandle,
  type BabyFeedSessionHandle,
} from "@/lib/baby-feed-session-store";

export { BABY_FEED_SESSION_STORAGE_KEY };

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/** Read a mergeable session handle from storage (null if missing/expired). */
export function readBabyHomeFeedSession(
  storage: StorageLike,
  ctx: { babyId: string; now: number },
): BabyFeedSessionHandle | null {
  try {
    return parseBabyFeedSessionHandle(
      storage.getItem(BABY_FEED_SESSION_STORAGE_KEY),
      ctx,
    );
  } catch {
    return null;
  }
}

/** Persist or clear the home feed-session handle. */
export function writeBabyHomeFeedSession(
  storage: StorageLike,
  next: BabyFeedSessionHandle | null,
): void {
  try {
    if (next) {
      storage.setItem(
        BABY_FEED_SESSION_STORAGE_KEY,
        serializeBabyFeedSessionHandle(next),
      );
    } else {
      storage.removeItem(BABY_FEED_SESSION_STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * After a confirmed quick-care response, adopt id/grace into the store.
 * Clears grace when breast starts again (open continuation).
 */
export function adoptBabyHomeFeedSessionAfterQuickCare(input: {
  babyId: string;
  now: number;
  previous: BabyFeedSessionHandle | null;
  localAfter: BabyQuickLocalAfter;
  steps: Array<{
    step: string;
    wrote?: string;
    event: { id: string; type: string };
  }>;
  storage?: StorageLike;
}): BabyFeedSessionHandle | null {
  const next = adoptFeedSessionAfterQuickCare(input);
  if (input.storage) {
    writeBabyHomeFeedSession(input.storage, next);
  }
  return next;
}
