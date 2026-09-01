import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import { safeRedirectUrl } from "@/lib/auth/redirect";
import { consumeAuthToken, TOKEN_PURPOSES } from "@/lib/auth/tokens";
import { config } from "@/lib/config";

export const runtime = "nodejs";

/**
 * Verifies a signup email via single-use token. On success the user's email
 * is marked verified and they're signed in (new users → /onboarding,
 * returning users → /settings, or the `next` param).
 */
export async function GET(req: NextRequest) {
  const rawToken = req.nextUrl.searchParams.get("token") ?? "";
  const next = req.nextUrl.searchParams.get("next");

  const result = await consumeAuthToken(rawToken, TOKEN_PURPOSES.EMAIL_VERIFY);
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/login?error=${result.error}`, req.nextUrl.origin));
  }

  const isAdmin = config.adminEmails.includes(result.email.toLowerCase());
  const user = await prisma.user.upsert({
    where: { email: result.email },
    update: { emailVerifiedAt: new Date() },
    create: { email: result.email, emailVerifiedAt: new Date(), isAdmin },
  });

  await setSessionCookie({ sub: user.id, email: user.email, plan: user.plan });

  const fallback = user.onboardedAt ? "/settings" : "/onboarding";
  return NextResponse.redirect(safeRedirectUrl(next, req.nextUrl.origin, fallback));
}
