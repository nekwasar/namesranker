import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.REDIS_URL ?? "",
    token: process.env.REDIS_TOKEN ?? "",
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
