import { sql } from "drizzle-orm";
import { db, withBypassRls } from "@/db";

/** Default TTL for stored Watch/quick-care replay rows (7 days). */
export const BABY_QUICK_CARE_TTL_HOURS = Number(
  process.env.BABY_QUICK_CARE_TTL_HOURS ?? 168,
);

/** Max rows deleted per prune call (bounds lock time). */
export const BABY_QUICK_CARE_PRUNE_BATCH_SIZE = 500;

/**
 * Delete expired `baby_quick_care_request` rows (best-effort / cron).
 * Rows newer than TTL stay for clientRequestId replay.
 */
export async function pruneExpiredBabyQuickCareRequests(): Promise<number> {
  const hours = Number.isFinite(BABY_QUICK_CARE_TTL_HOURS)
    ? Math.max(1, Math.floor(BABY_QUICK_CARE_TTL_HOURS))
    : 168;
  const batch = BABY_QUICK_CARE_PRUNE_BATCH_SIZE;

  return withBypassRls(async () => {
    const result = await db.execute(sql`
      DELETE FROM baby_quick_care_request
      WHERE id IN (
        SELECT id FROM baby_quick_care_request
        WHERE created_at < now() - (${hours}::int * interval '1 hour')
        ORDER BY created_at ASC
        LIMIT ${batch}
      )
      RETURNING 1
    `);
    return Array.from(result as unknown as Iterable<unknown>).length;
  });
}
