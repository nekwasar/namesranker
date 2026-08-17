import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests when no Redis is configured (local dev/test)", async () => {
    delete process.env.REDIS_URL;
    const result = await rateLimit("test:key", 3, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("rejects when over limit (Redis configured)", async () => {
    process.env.REDIS_URL = "https://example.upstash.io";
    process.env.REDIS_TOKEN = "token";

    // Stub redis.pipeline() to simulate 3 existing hits.
    const { redis } = await import("@/lib/redis");
    const fakePipe = {
      zremrangebyscore: vi.fn(() => fakePipe),
      zcard: vi.fn(() => fakePipe),
      zadd: vi.fn(() => fakePipe),
      expire: vi.fn(() => fakePipe),
      exec: vi.fn(async () => [0, 3, 1, 1]),
    };
    vi.spyOn(redis, "pipeline").mockReturnValue(fakePipe as never);

    const result = await rateLimit("test:key", 3, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);

    vi.restoreAllMocks();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TOKEN;
  });

  it("allows under the limit", async () => {
    process.env.REDIS_URL = "https://example.upstash.io";
    process.env.REDIS_TOKEN = "token";

    const { redis } = await import("@/lib/redis");
    const fakePipe = {
      zremrangebyscore: vi.fn(() => fakePipe),
      zcard: vi.fn(() => fakePipe),
      zadd: vi.fn(() => fakePipe),
      expire: vi.fn(() => fakePipe),
      exec: vi.fn(async () => [0, 1, 1, 1]),
    };
    vi.spyOn(redis, "pipeline").mockReturnValue(fakePipe as never);

    const result = await rateLimit("test:key", 3, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);

    vi.restoreAllMocks();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TOKEN;
  });
});
