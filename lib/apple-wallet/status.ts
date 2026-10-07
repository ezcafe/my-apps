import type { AppleWalletSubscriberStatus } from "@/db/schema/apple-wallet";

export type WalletUiStatus =
  | "not_linked"
  | "pending"
  | "active"
  | "fail";

/**
 * Map DB subscriber + registration count to Settings status.
 * `requestFail` is navigation-scoped only — never persisted.
 */
export function walletStatusFrom(
  subscriber: { status: AppleWalletSubscriberStatus } | null,
  regCount: number,
  requestFail = false,
): WalletUiStatus {
  if (requestFail) return "fail";
  if (!subscriber || subscriber.status !== "active") return "not_linked";
  if (regCount >= 1) return "active";
  return "pending";
}
