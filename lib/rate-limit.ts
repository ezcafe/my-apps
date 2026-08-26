import { sql } from "drizzle-orm";
import { db } from "@/db";
import { isDbUnreachable } from "@/lib/db-errors";

type RateLimitOptions = {
  name: string;
  request: Request;
  points: number;
  durationSeconds: number;
  userKey?: string | null;
};

type MemoryBucket = { count: number; bucketStartMs: number };

const memoryBuckets = new Map<string, MemoryBucket>();
const MEMORY_BUCKET_MAX_KEYS = 10_000;

function normalizeIp(value: string | null): string | null {
  if (!value) return null;
  const ip = value.split(",")[0]?.trim();
  return ip || null;
}

function trustedForwardedIp(request: Request): string | null {
  const trustedProxies = process.env.TRUSTED_PROXIES?.trim();
  if (!trustedProxies) return null;
  return normalizeIp(request.headers.get("x-forwarded-for"));
}

export function rateLimitPrincipal(
  request: Request,
  userKey?: string | null,
): string {
  if (userKey) return `u:${userKey}`;
  const forwarded = trustedForwardedIp(request);
  if (forwarded) return `ip:${forwarded}`;
  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  if (realIp) return `ip:${realIp}`;
  return "anon";
}

function enforceMemoryRateLimit(
  key: string,
  points: number,
  durationSeconds: number,
): boolean {
  const now = Date.now();
  const bucketMs = durationSeconds * 1000;
  const bucketStartMs = Math.floor(now / bucketMs) * bucketMs;
  const existing = memoryBuckets.get(key);
  if (!existing || existing.bucketStartMs !== bucketStartMs) {
    if (memoryBuckets.size >= MEMORY_BUCKET_MAX_KEYS) {
      // Fail closed under memory pressure rather than allow unlimited traffic.
      return false;
    }
    memoryBuckets.set(key, { count: 1, bucketStartMs });
    return true;
  }
  existing.count += 1;
  return existing.count <= points;
}

export async function enforceRateLimit(opts: RateLimitOptions): Promise<boolean> {
  const principal = rateLimitPrincipal(opts.request, opts.userKey);
  const now = Date.now();
  const bucketMs = opts.durationSeconds * 1000;
  const bucketStartMs = Math.floor(now / bucketMs) * bucketMs;
  const bucketStart = new Date(bucketStartMs).toISOString();
  const key = `${opts.name}:${principal}`;
  try {
    const result = await db.execute(sql`
    INSERT INTO security_rate_limit (key, bucket_start, count, updated_at)
    VALUES (${key}, ${bucketStart}::timestamptz, 1, now())
    ON CONFLICT (key, bucket_start)
    DO UPDATE SET count = security_rate_limit.count + 1, updated_at = now()
    RETURNING count
  `);

    const rows = Array.from(result as unknown as Iterable<{ count: number }>);
    const count = rows[0]?.count ?? 1;
    return count <= opts.points;
  } catch (e) {
    if (isDbUnreachable(e)) {
      // Prefer in-memory fallback over fail-open when the rate-limit store is down.
      return enforceMemoryRateLimit(key, opts.points, opts.durationSeconds);
    }
    throw e;
  }
}
