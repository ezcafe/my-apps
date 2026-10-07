/** Apple Wallet / PassKit enable gate — all required env + HTTPS public URL. */

import { X509Certificate } from "node:crypto";
import type { AppleWalletReasonCode } from "@/lib/apple-wallet/constants";

export type { AppleWalletReasonCode };

export type AppleWalletConfig = {
  passTypeId: string;
  teamId: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
  wwdr: string;
  baseUrl: string;
};

export type AppleWalletDiagnosis = {
  enabled: boolean;
  healthyForAdd: boolean;
  reasons: AppleWalletReasonCode[];
  signerValidTo: string | null;
};

const REQUIRED_APPLE_KEYS = [
  "APPLE_PASS_TYPE_ID",
  "APPLE_TEAM_ID",
  "APPLE_SIGNER_CERT",
  "APPLE_SIGNER_KEY",
  "APPLE_WWDR_CERT",
] as const;

/** Warn when signer expires within this many days; Add still allowed. */
const SIGNER_EXPIRING_DAYS = 30;

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

function hasAllPasskitMaterial(env: NodeJS.ProcessEnv): boolean {
  return REQUIRED_APPLE_KEYS.every((key) => Boolean(env[key]?.trim()));
}

/**
 * Diagnose channel readiness for Settings.
 * Binary enable stays `isAppleWalletEnabled`; this explains why and Add health.
 * Reasons: fully healthy → exactly `["ready"]`; otherwise blockers/warns only (XOR).
 */
export function diagnoseAppleWallet(
  env: NodeJS.ProcessEnv = process.env,
): AppleWalletDiagnosis {
  const enabled = isAppleWalletEnabled(env);
  const reasons: AppleWalletReasonCode[] = [];

  if (getAppleWalletBaseUrl(env) == null) {
    reasons.push("public_url_https");
  }
  if (!hasAllPasskitMaterial(env)) {
    reasons.push("passkit_certs");
  }

  let signerValidTo: string | null = null;
  let signerReadable = false;
  let expired = false;

  const signerRaw = env.APPLE_SIGNER_CERT?.trim();
  if (signerRaw) {
    try {
      const pem = decodePem(signerRaw);
      const cert = new X509Certificate(pem);
      const validTo = new Date(cert.validTo);
      if (Number.isNaN(validTo.getTime())) {
        reasons.push("signer_unreadable");
      } else {
        signerReadable = true;
        signerValidTo = validTo.toISOString();
        const now = Date.now();
        if (validTo.getTime() < now) {
          expired = true;
          reasons.push("signer_expired");
        } else {
          const msLeft = validTo.getTime() - now;
          if (msLeft <= SIGNER_EXPIRING_DAYS * 24 * 60 * 60 * 1000) {
            reasons.push("signer_expiring");
          }
        }
      }
    } catch {
      reasons.push("signer_unreadable");
    }
  }

  const healthyForAdd = enabled && signerReadable && !expired;

  if (reasons.length === 0) {
    return {
      enabled,
      healthyForAdd: true,
      reasons: ["ready"],
      signerValidTo,
    };
  }

  return {
    enabled,
    healthyForAdd,
    reasons,
    signerValidTo,
  };
}
