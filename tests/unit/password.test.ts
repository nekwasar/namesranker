import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, checkPasswordStrength } from "@/lib/auth/password";

describe("password hashing", () => {
  it("round-trips a password", () => {
    const stored = hashPassword("Sup3r-secret!");
    expect(stored).toContain(":");
    expect(verifyPassword("Sup3r-secret!", stored)).toBe(true);
  });

  it("rejects the wrong password", () => {
    const stored = hashPassword("Sup3r-secret!");
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("salts each hash uniquely", () => {
    const a = hashPassword("Sup3r-secret!");
    const b = hashPassword("Sup3r-secret!");
    expect(a).not.toBe(b);
  });

  it("rejects malformed stored values", () => {
    expect(verifyPassword("x", "not-a-valid-format")).toBe(false);
    expect(verifyPassword("x", "salthash")).toBe(false);
  });
});

describe("checkPasswordStrength", () => {
  it("accepts a strong password", () => {
    const result = checkPasswordStrength("Sup3r-secret!");
    expect(result.valid).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("lists every missing rule", () => {
    const result = checkPasswordStrength("short");
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("at least 8 characters");
    expect(result.reasons).toContain("an uppercase letter");
    expect(result.reasons).toContain("a number");
    expect(result.reasons).toContain("a symbol (!@#$…)");
  });

  it("flags individual gaps", () => {
    expect(checkPasswordStrength("aaaaaaaa").reasons).toContain("an uppercase letter");
    expect(checkPasswordStrength("AAAAAAA1!").reasons).toContain("a lowercase letter");
    expect(checkPasswordStrength("Abcdefgh").reasons).toContain("a number");
    expect(checkPasswordStrength("Abcdefg1").reasons).toContain("a symbol (!@#$…)");
  });
});
