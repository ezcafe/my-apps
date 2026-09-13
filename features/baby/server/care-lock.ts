import { sql } from "drizzle-orm";
import { db, withDbTransaction } from "@/db";

/**
 * The one concurrency rule for naps. Every writer that can start or end a nap
 * runs inside this. One key per workspace, so two caregivers in the same
 * family queue instead of interleaving. Released on COMMIT or ROLLBACK.
 */
export const BABY_CARE_LOCK_SUFFIX = ":baby-care";

export type BabyCareTx = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
};

export type BabyCareLockDeps = {
  transaction: <T>(fn: (tx: BabyCareTx) => Promise<T>) => Promise<T>;
  acquire: (tx: BabyCareTx, workspaceId: string) => Promise<void>;
};

export function defaultCareLockDeps(): BabyCareLockDeps {
  return {
    transaction: async (fn) =>
      withDbTransaction(async () => fn(db as unknown as BabyCareTx)),
    acquire: async (_tx, workspaceId) => {
      await db.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${workspaceId + BABY_CARE_LOCK_SUFFIX}))`,
      );
    },
  };
}

export async function withBabyCareLock<T>(
  workspaceId: string,
  run: (tx: BabyCareTx) => Promise<T>,
  deps: BabyCareLockDeps = defaultCareLockDeps(),
): Promise<T> {
  return deps.transaction(async (tx) => {
    await deps.acquire(tx, workspaceId);
    return run(tx);
  });
}
