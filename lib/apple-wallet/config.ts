/** Apple Wallet / PassKit enable gate — all required env + HTTPS public URL. */

export type AppleWalletConfig = {
  passTypeId: string;
  teamId: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
  wwdr: string;
  baseUrl: string;
};

const REQUIRED_APPLE_KEYS = [
  "APPLE_PASS_TYPE_ID",
  "APPLE_TEAM_ID",
  "APPLE_SIGNER_CERT",
  "APPLE_SIGNER_KEY",
  "APPLE_WWDR_CERT",
] as const;

/** Decode PEM from raw PEM text or base64-encoded PEM (WalletCast style). */
export function decodePem(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("-----BEGIN")) return trimmed;
  try {
    return Buffer.from(trimmed, "base64").toString("utf8");
  } catch {
    return trimmed;
  }
}

/** Public HTTPS base URL used as PassKit webServiceURL origin. */
export function getAppleWalletBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw =
    env.BASE_URL?.trim() ||
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  if (!raw) return null;
  const url = raw.replace(/\/$/, "");
  if (!url.startsWith("https://")) return null;
  return url;
}

export function isAppleWalletEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  for (const key of REQUIRED_APPLE_KEYS) {
    if (!env[key]?.trim()) return false;
  }
  return getAppleWalletBaseUrl(env) != null;
}

export function getAppleWalletConfig(
  env: NodeJS.ProcessEnv = process.env,
): AppleWalletConfig | null {
  if (!isAppleWalletEnabled(env)) return null;
  const baseUrl = getAppleWalletBaseUrl(env);
  if (!baseUrl) return null;
  return {
    passTypeId: env.APPLE_PASS_TYPE_ID!.trim(),
    teamId: env.APPLE_TEAM_ID!.trim(),
    signerCert: decodePem(env.APPLE_SIGNER_CERT!),
    signerKey: decodePem(env.APPLE_SIGNER_KEY!),
    signerKeyPassphrase: env.APPLE_SIGNER_KEY_PASSPHRASE?.trim() || undefined,
    wwdr: decodePem(env.APPLE_WWDR_CERT!),
    baseUrl,
  };
}
