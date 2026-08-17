import { createHash, randomBytes } from "node:crypto";

/**
 * Magic-link token helpers.
 *
 * Security model:
 * - Raw token is random (32 bytes, base64url) and sent only in the email link.
 * - Only the SHA-256 hash of the token is stored in the DB (spec §12.1).
 * - Tokens are single-use (`usedAt`) and expire after 15 minutes.
 */

export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function buildVerifyUrl(baseUrl: string, rawToken: string): string {
  const url = new URL("/api/auth/verify", baseUrl);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export function isTokenExpired(expiresAt: Date): boolean {
  return Date.now() > expiresAt.getTime();
}
