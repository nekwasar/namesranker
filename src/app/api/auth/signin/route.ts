import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { verifyPassword } from "@/lib/auth/password";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit per email + IP to slow credential stuffing.
  const [emailLimit, ipLimit] = await Promise.all([
    rateLimit(`signin:email:${normalizedEmail}`, 10, 300),
    rateLimit(`signin:ip:${ip}`, 20, 300),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 300 }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Generic error: never reveal whether the email or the password was wrong.
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  if (!user.emailVerifiedAt) {
    return NextResponse.json({ error: "email_not_verified" }, { status: 403 });
  }

  await setSessionCookie({ sub: user.id, email: user.email, plan: user.plan });

  const fallback = user.onboardedAt ? "/settings" : "/onboarding";
  const next = safeRedirectPath(parsed.data.next ?? null, fallback);
  return NextResponse.json({ ok: true, next }, { status: 200 });
}
