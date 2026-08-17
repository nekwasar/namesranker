import { describe, expect, it } from "vitest";
import { buildVerifyUrl, generateRawToken, hashToken, isTokenExpired } from "@/lib/auth/magic-link";

describe("magic-link helpers", () => {
  it("generates unique raw tokens", () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes tokens deterministically and irreversibly", () => {
    const token = generateRawToken();
    const h1 = hashToken(token);
    const h2 = hashToken(token);
    expect(h1).toBe(h2);
    expect(h1).not.toContain(token);
    expect(h1).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
  });

  it("builds a verify URL with the token on the correct path", () => {
    const url = buildVerifyUrl("https://namesranker.com", "abc123");
    expect(url).toContain("https://namesranker.com/api/auth/verify");
    expect(url).toContain("token=abc123");
  });

  it("detects expiry", () => {
    expect(isTokenExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isTokenExpired(new Date(Date.now() + 1000))).toBe(false);
  });
});
