const DEFAULT_JSON_MAX_BYTES = 256 * 1024;

function getContentLength(request: Request): number | null {
  const raw = request.headers.get("content-length");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function readJsonBounded(
  request: Request,
  maxBytes = DEFAULT_JSON_MAX_BYTES,
): Promise<unknown> {
  const length = getContentLength(request);
  if (length != null && length > maxBytes) {
    throw new Error(`Payload too large (max ${maxBytes} bytes)`);
  }
  return request.json();
}

export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  const requestOrigin = new URL(request.url).origin;
  return origin === requestOrigin || origin === `https://${host}` || origin === `http://${host}`;
}
