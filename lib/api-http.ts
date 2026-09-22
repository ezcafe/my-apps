import { NextResponse } from "next/server";

/** Shared REST error envelope: `{ error, code, details? }`. */
export async function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message, code: "unauthorized" }, { status: 401 });
}

export async function badRequest(message: string, details?: unknown) {
  const body: { error: string; code: string; details?: unknown } = {
    error: message,
    code: "bad_request",
  };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status: 400 });
}

export async function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message, code: "forbidden" }, { status: 403 });
}

export async function notFound(message = "Not found") {
  return NextResponse.json({ error: message, code: "not_found" }, { status: 404 });
}

export async function conflict(message: string, code = "conflict") {
  return NextResponse.json({ error: message, code }, { status: 409 });
}

export async function rateLimited(message = "Too many requests") {
  return NextResponse.json({ error: message, code: "rate_limited" }, { status: 429 });
}

export function dbUnavailable(message = "Database unavailable") {
  return NextResponse.json({ error: message, code: "db_unavailable" }, { status: 503 });
}

/** Intentional user-facing error — safe to return as `error` string. */
export class ClientFacingError extends Error {
  readonly clientFacing = true as const;
  constructor(message: string) {
    super(message);
    this.name = "ClientFacingError";
  }
}

/**
 * Map thrown errors to a stable client string.
 * Pass ClientFacingError / allowlisted domain messages through; never forward raw ops/DB text.
 */
export function clientSafeErrorMessage(
  err: unknown,
  fallback: string,
  allowed: ReadonlySet<string> = new Set(),
): string {
  if (err instanceof ClientFacingError) return err.message;
  if (err instanceof Error && allowed.has(err.message)) {
    return err.message;
  }
  return fallback;
}
