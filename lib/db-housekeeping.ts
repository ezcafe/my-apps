import { sql } from "drizzle-orm";
import { db, withBypassRls } from "@/db";
import { pruneExpiredImportPreviews } from "@/lib/money-import-preview-store";
import { pruneExpiredBabyQuickCareRequests } from "@/lib/baby-quick-care-prune";
import { getAppleWalletStore } from "@/lib/apple-wallet/services";

/** Delete rate-limit buckets older than 1 hour (see docs/PERFORMANCE.md). */
export async function pruneStaleSecurityRateLimits(): Promise<number> {
  return withBypassRls(async () => {
    const result = await db.execute(sql`
      DELETE FROM security_rate_limit
      WHERE bucket_start < now() - interval '1 hour'
      RETURNING 1
    `);
    return Array.from(result as unknown as Iterable<unknown>).length;
  });
}

/** Delete expired or already-consumed Apple Wallet QR issue tokens. */
export async function pruneAppleWalletIssueTokens(
  now: Date = new Date(),
): Promise<number> {
  return getAppleWalletStore().pruneIssueTokens(now);
}

export type DbHousekeepingResult = {
  rateLimitDeleted: number;
  importPreviewsPruned: boolean;
  babyQuickCareDeleted: number;
  appleWalletIssueTokensDeleted: number;
};

/** Cron entry: rate-limit rows, expired import previews, old baby quick-care replays, Apple issue tokens. */
export async function runDbHousekeeping(): Promise<DbHousekeepingResult> {
  const rateLimitDeleted = await pruneStaleSecurityRateLimits();
  await pruneExpiredImportPreviews();
  const babyQuickCareDeleted = await pruneExpiredBabyQuickCareRequests();
  const appleWalletIssueTokensDeleted = await pruneAppleWalletIssueTokens();
  return {
    rateLimitDeleted,
    importPreviewsPruned: true,
    babyQuickCareDeleted,
    appleWalletIssueTokensDeleted,
  };
}
