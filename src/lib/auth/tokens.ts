import { prisma } from "@/lib/db";
import { generateRawToken, hashToken, isTokenExpired } from "@/lib/auth/magic-link";

export const TOKEN_PURPOSES = {
  MAGIC_LINK: "MAGIC_LINK",
  EMAIL_VERIFY: "EMAIL_VERIFY",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;

export type TokenPurpose = (typeof TOKEN_PURPOSES)[keyof typeof TOKEN_PURPOSES];

export const emailVerifyTokenTtlMs = 24 * 60 * 60 * 1000; // 24 hours
export const passwordResetTokenTtlMs = 60 * 60 * 1000; // 1 hour

/**
 * Create a single-use token for the given purpose. Returns the raw token —
 * only its SHA-256 hash is stored (same model as magic links, spec §12.1).
 */
export async function createAuthToken(
  email: string,
  purpose: TokenPurpose,
  ttlMs: number
): Promise<string> {
  const rawToken = generateRawToken();
  await prisma.magicLinkToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      email,
      purpose,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return rawToken;
}

export type TokenConsumeResult =
  { ok: true; email: string } | { ok: false; error: "invalid" | "used" | "expired" };

/** Consume a token for a purpose. Single-use and expiry-checked. */
export async function consumeAuthToken(
  rawToken: string,
  purpose: TokenPurpose
): Promise<TokenConsumeResult> {
  if (!rawToken) return { ok: false, error: "invalid" };
  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record || record.purpose !== purpose) return { ok: false, error: "invalid" };
  if (record.usedAt) return { ok: false, error: "used" };
  if (isTokenExpired(record.expiresAt)) return { ok: false, error: "expired" };

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return { ok: true, email: record.email };
}

export function buildVerifyEmailUrl(baseUrl: string, rawToken: string): string {
  const url = new URL("/api/auth/verify-email", baseUrl);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export function buildResetPasswordUrl(baseUrl: string, rawToken: string): string {
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", rawToken);
  return url.toString();
}
