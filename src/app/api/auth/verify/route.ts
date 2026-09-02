import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { hashToken, isTokenExpired } from "@/lib/auth/magic-link";
import { setSessionCookie } from "@/lib/auth/session";
import { safeRedirectUrl } from "@/lib/auth/redirect";

export const runtime = "nodejs";

/**
 * Verifies a magic-link token. Single-use, 15-minute expiry.
 * Spec §3.1 / §9: success → set session → redirect new users to /onboarding,
 * returning users to /settings (or the `next` param if provided).
 */
export async function GET(req: NextRequest) {
  const rawToken = req.nextUrl.searchParams.get("token");
  const next = req.nextUrl.searchParams.get("next") ?? "/settings";

  // Redirects always use the canonical config.appUrl, never the request-derived
  // origin (the container's internal 0.0.0.0:3000 must not leak into links).
  if (!rawToken) {
    return NextResponse.redirect(new URL("/login?error=invalid", config.appUrl));
  }

  const tokenHash = hashToken(rawToken);
  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return NextResponse.redirect(new URL("/login?error=invalid", config.appUrl));
  }

  if (record.usedAt) {
    return NextResponse.redirect(new URL("/login?error=used", config.appUrl));
  }

  if (isTokenExpired(record.expiresAt)) {
    return NextResponse.redirect(new URL("/login?error=expired", config.appUrl));
  }

  // Single-use: mark consumed before signing in (protects against replay even
  // if the redirect below is interrupted).
  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  const isAdmin = config.adminEmails.includes(record.email.toLowerCase());
  const user = await prisma.user.upsert({
    where: { email: record.email },
    update: {},
    create: { email: record.email, isAdmin },
  });

  await setSessionCookie({
    sub: user.id,
    email: user.email,
    plan: user.plan,
  });

  return NextResponse.redirect(safeRedirectUrl(next, config.appUrl, "/settings"));
}
