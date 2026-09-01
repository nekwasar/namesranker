import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing via Node's built-in scrypt (no external deps).
 * Stored format: `salt:hash` (salt 16 bytes hex, hash 64 bytes hex).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export interface PasswordStrength {
  valid: boolean;
  /** Human-readable reasons the password fails (empty when valid). */
  reasons: string[];
}

/**
 * Strong password rules: >= 8 chars with upper, lower, digit, and symbol.
 * Returns reasons so the client can show live feedback.
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const reasons: string[] = [];
  if (password.length < 8) reasons.push("at least 8 characters");
  if (!/[a-z]/.test(password)) reasons.push("a lowercase letter");
  if (!/[A-Z]/.test(password)) reasons.push("an uppercase letter");
  if (!/[0-9]/.test(password)) reasons.push("a number");
  if (!/[^A-Za-z0-9]/.test(password)) reasons.push("a symbol (!@#$…)");
  return { valid: reasons.length === 0, reasons };
}
