import { redis } from "@/lib/redis";

/**
 * Sliding-window rate limiter backed by Redis.
 * Falls back to a no-op when REDIS_URL is unset (local dev / tests) so flows
 * don't break, while remaining strict in deployed environments.
 *
 * Spec §3.1: magic links limited per email/IP (e.g. 3/min).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!process.env.REDIS_URL) {
    // No Redis configured: allow (local dev/test only).
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const redisKey = `ratelimit:${key}`;

  // Remove entries older than the window, count current hits, then add this hit.
  const pipe = redis.pipeline();
  pipe.zremrangebyscore(redisKey, 0, windowStart);
  pipe.zcard(redisKey);
  pipe.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
  pipe.expire(redisKey, windowSeconds);

  const [, countResult] = await pipe.exec();

  const hits = Number(countResult);
  const allowed = hits < limit;

  return {
    allowed,
    remaining: Math.max(0, limit - hits),
    retryAfterSeconds: allowed ? 0 : windowSeconds,
  };
}
