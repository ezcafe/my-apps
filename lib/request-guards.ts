const DEFAULT_JSON_MAX_BYTES = 256 * 1024;

function getContentLength(request: Request): number | null {
  const raw = request.headers.get("content-length");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

async function readBodyTextBounded(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const length = getContentLength(request);
  if (length != null && length > maxBytes) {
    throw new Error(`Payload too large (max ${maxBytes} bytes)`);
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.byteLength) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore cancel errors */
      }
      throw new Error(`Payload too large (max ${maxBytes} bytes)`);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function readJsonBounded(
  request: Request,
  maxBytes = DEFAULT_JSON_MAX_BYTES,
): Promise<unknown> {
  const text = await readBodyTextBounded(request, maxBytes);
  return JSON.parse(text) as unknown;
}

function originsMatch(origin: string, request: Request): boolean {
  const host = request.headers.get("host");
  if (!host) return false;
  const requestOrigin = new URL(request.url).origin;
  return (
    origin === requestOrigin ||
    origin === `https://${host}` ||
    origin === `http://${host}`
  );
}

/**
 * Same-origin check for cookie/session mutating REST.
 * Missing Origin is allowed (non-browser clients); prefer assertSameOriginStrict
 * for browser session POSTs.
 */
export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return originsMatch(origin, request);
}

/** Reject when Origin is missing or mismatches (CSRF-safe for cookie sessions). */
export function assertSameOriginStrict(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return originsMatch(origin, request);
}

/**
 * CSRF guard for GraphQL/session cookie requests.
 * API tokens skip Origin checks. Cookie/session POSTs require a matching Origin.
 */
export function assertSessionMutationCsrf(
  request: Request,
  opts: { authMethod: "session" | "api_key" | null; hasCookie: boolean },
): boolean {
  if (opts.authMethod === "api_key") return true;
  if (opts.authMethod === "session" || opts.hasCookie) {
    return assertSameOriginStrict(request);
  }
  return true;
}
