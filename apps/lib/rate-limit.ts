import { sql } from "drizzle-orm";
import { db } from "@/db";

type RateLimitOptions = {
  name: string;
  request: Request;
  points: number;
  durationSeconds: number;
  userKey?: string | null;
};

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

export async function enforceRateLimit(opts: RateLimitOptions): Promise<boolean> {
  const principal = rateLimitPrincipal(opts.request, opts.userKey);
  const now = Date.now();
  const bucketMs = opts.durationSeconds * 1000;
  const bucketStartMs = Math.floor(now / bucketMs) * bucketMs;
  const bucketStart = new Date(bucketStartMs).toISOString();
  const key = `${opts.name}:${principal}`;

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
}
