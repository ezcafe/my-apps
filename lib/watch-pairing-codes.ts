import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** Unambiguous alphabet (no 0/O/1/I). */
export const WATCH_PAIR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const WATCH_PAIR_CODE_LENGTH = 6;
export const WATCH_PAIR_TTL_MS = 10 * 60 * 1000;
/** @deprecated Prefer formatApiPairingTokenName — kept for older docs/tests */
export const WATCH_TOKEN_NAME = "Apple Watch";

/** Display name for tokens created via pairing redeem. */
export function formatApiPairingTokenName(at: Date = new Date()): string {
  const stamp = at.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `API pairing · ${stamp}`;
}

export type WatchPairErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "INVALID_CODE"
  | "EXPIRED"
  | "CONSUMED"
  | "RATE_LIMITED";

export class WatchPairError extends Error {
  readonly code: WatchPairErrorCode;
  constructor(code: WatchPairErrorCode, message: string) {
    super(message);
    this.name = "WatchPairError";
    this.code = code;
  }
}

/** Trim + uppercase for hash/compare. */
export function normalizeWatchPairCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function hashWatchPairCode(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function generateWatchPairCode(
  length: number = WATCH_PAIR_CODE_LENGTH,
): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += WATCH_PAIR_ALPHABET[randomInt(WATCH_PAIR_ALPHABET.length)]!;
  }
  return out;
}

export function codesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function publicAppOrigin(): string {
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (fromPublic) return fromPublic;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://127.0.0.1:3000";
}

export function isValidWatchPairCodeShape(normalized: string): boolean {
  if (normalized.length < 6 || normalized.length > 8) return false;
  for (const ch of normalized) {
    if (!WATCH_PAIR_ALPHABET.includes(ch)) return false;
  }
  return true;
}
