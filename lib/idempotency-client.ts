import { IDEMPOTENCY_KEY_MAX_LENGTH } from "@/lib/idempotency-constants";

/**
 * Mint an Idempotency-Key for one user-initiated mutating attempt.
 * Call again for a new attempt (never reuse across different bodies).
 */
export function mintIdempotencyKey(): string {
  const key = crypto.randomUUID();
  if ([...key].length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    return [...key].slice(0, IDEMPOTENCY_KEY_MAX_LENGTH).join("");
  }
  return key;
}

/**
 * JSON POST headers with a fresh Idempotency-Key.
 * Content-Type and Idempotency-Key always win over `extra`.
 */
export function jsonWithIdempotencyHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json");
  headers.set("Idempotency-Key", mintIdempotencyKey());
  return headers;
}
