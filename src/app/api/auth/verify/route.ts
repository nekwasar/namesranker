import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

  if (!rawToken) {
    return NextResponse.redirect(new URL("/login?error=invalid", req.nextUrl.origin));
  }

  const tokenHash = hashToken(rawToken);
  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return NextResponse.redirect(new URL("/login?error=invalid", req.nextUrl.origin));
  }

  if (record.usedAt) {
    return NextResponse.redirect(new URL("/login?error=used", req.nextUrl.origin));
  }

  if (isTokenExpired(record.expiresAt)) {
    return NextResponse.redirect(new URL("/login?error=expired", req.nextUrl.origin));
  }

  // Single-use: mark consumed before signing in (protects against replay even
  // if the redirect below is interrupted).
  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { email: record.email },
    update: {},
    create: { email: record.email },
  });

  await setSessionCookie({
    sub: user.id,
    email: user.email,
    plan: user.plan,
  });

  return NextResponse.redirect(safeRedirectUrl(next, req.nextUrl.origin, "/settings"));
}
