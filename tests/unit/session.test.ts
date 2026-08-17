import { describe, expect, it } from "vitest";
import { signSession, verifySessionToken } from "@/lib/auth/session";

describe("session JWT", () => {
  it("signs and verifies a session round-trip", async () => {
    process.env.NEXTAUTH_SECRET = "x".repeat(32);
    const payload = {
      sub: "user_123",
      email: "john@example.com",
      plan: "FREE" as const,
    };

    const token = await signSession(payload);
    const verified = await verifySessionToken(token);

    expect(verified).toEqual(payload);
  });

  it("rejects a token signed with a different secret", async () => {
    process.env.NEXTAUTH_SECRET = "x".repeat(32);
    const token = await signSession({
      sub: "user_123",
      email: "john@example.com",
      plan: "FREE",
    });

    process.env.NEXTAUTH_SECRET = "y".repeat(32);
    const verified = await verifySessionToken(token);
    expect(verified).toBeNull();
  });

  it("returns null for garbage tokens", async () => {
    process.env.NEXTAUTH_SECRET = "x".repeat(32);
    expect(await verifySessionToken("not-a-token")).toBeNull();
  });
});
