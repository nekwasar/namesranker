import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { config } from "@/lib/config";
import { createAuthToken, buildResetPasswordUrl, passwordResetTokenTtlMs } from "@/lib/auth/tokens";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * Always returns ok (anti-enumeration). Sends a reset link when the account
 * exists — including passwordless (magic-link) accounts, which lets them set
 * a password for the first time. Existing active tokens are left alone; each
 * is single-use and expires in 1 hour.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();

  const limit = await rateLimit(`forgot:ip:${ip}`, 5, 600);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 600 }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  let devUrl: string | undefined;
  if (user) {
    const rawToken = await createAuthToken(email, "PASSWORD_RESET", passwordResetTokenTtlMs);
    const resetUrl = buildResetPasswordUrl(config.appUrl, rawToken);
    await sendEmail(passwordResetEmail(email, resetUrl));
    if (process.env.E2E_MAGIC_LINK_DEV === "1") devUrl = resetUrl;
  }

  const body: Record<string, unknown> = { ok: true };
  if (devUrl) body.devUrl = devUrl;
  return NextResponse.json(body, { status: 200 });
}
