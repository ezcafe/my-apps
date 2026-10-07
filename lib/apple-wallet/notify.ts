import type { ApnsSender } from "@/lib/apple-wallet/apns";
import { isAppleWalletEnabled } from "@/lib/apple-wallet/config";
import type { AppleWalletStore } from "@/lib/apple-wallet/store";

export type NotifyWalletCareDeps = {
  isAppleWalletEnabled: () => boolean;
  store: AppleWalletStore;
  apns: ApnsSender;
  now?: () => Date;
};

/**
 * Upsert workspace latest + bump active subscribers, then empty APNs.
 * APNs runs after the DB tx (best-effort; prune 410/Unregistered).
 */
export async function notifyWalletCare(
  workspaceId: string,
  careSummary: string,
  deps: NotifyWalletCareDeps,
): Promise<{ pushed: number; pruned: number; skipped: boolean }> {
  if (!deps.isAppleWalletEnabled()) {
    return { pushed: 0, pruned: 0, skipped: true };
  }
  const now = (deps.now ?? (() => new Date()))();
  await deps.store.notifyCare(workspaceId, careSummary, now);
  const tokens = await deps.store.pushTokensForWorkspace(workspaceId);
  if (tokens.length === 0) {
    return { pushed: 0, pruned: 0, skipped: true };
  }
  const result = await deps.apns.sendPassUpdates(tokens);
  if (result.invalidTokens.length > 0) {
    await deps.store.removePushTokens(result.invalidTokens);
  }
  return {
    pushed: result.sent,
    pruned: result.invalidTokens.length,
    skipped: false,
  };
}
