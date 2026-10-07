/** Shared Apple Wallet paths/filenames (safe for client + server). */

export const APPLE_WALLET_PKPASS_FILENAME = "baby-care.pkpass";

/** Navigational issue URL for Settings Add (form GET / location / <a href>). */
export const APPLE_WALLET_ISSUE_PATH = "/api/apple-wallet/issue";

/** In-app Help anchor for Apple Wallet setup (not a docs/* route). */
export const APPLE_WALLET_SETUP_GUIDE_HREF = "/help#apple-wallet";

/** Caregiver-safe reason codes for Settings readiness (never env names / PEM). */
export type AppleWalletReasonCode =
  | "ready"
  | "public_url_https"
  | "passkit_certs"
  | "signer_unreadable"
  | "signer_expired"
  | "signer_expiring";
