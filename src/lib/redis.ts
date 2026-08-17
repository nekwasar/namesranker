import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

/**
 * Lazy Redis client. Created only when REDIS_URL is configured (prod/CI);
 * otherwise returns undefined so callers can fall back gracefully (local dev).
 */
export const redis: Redis | undefined =
  globalForRedis.redis ??
  (process.env.REDIS_URL
    ? new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN ?? "",
      })
    : undefined);

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}
