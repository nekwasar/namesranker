import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, verifyEmailEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { config } from "@/lib/config";
import { hashPassword, checkPasswordStrength } from "@/lib/auth/password";
import { createAuthToken, buildVerifyEmailUrl, emailVerifyTokenTtlMs } from "@/lib/auth/tokens";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { firstName, lastName, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const strength = checkPasswordStrength(password);
  if (!strength.valid) {
    return NextResponse.json(
      { error: "weak_password", reasons: strength.reasons },
      { status: 400 }
    );
  }

  const limit = await rateLimit(`signup:ip:${ip}`, 5, 600);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 600 }, { status: 429 });
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "account_exists" }, { status: 409 });
  }

  const isAdmin = config.adminEmails.includes(normalizedEmail);
  await prisma.user.create({
    data: {
      email: normalizedEmail,
      firstName,
      lastName,
      passwordHash: hashPassword(password),
      isAdmin,
    },
  });

  const rawToken = await createAuthToken(normalizedEmail, "EMAIL_VERIFY", emailVerifyTokenTtlMs);
  const verifyUrl = buildVerifyEmailUrl(config.appUrl, rawToken);
  await sendEmail(verifyEmailEmail(normalizedEmail, verifyUrl));

  // Dev/test only: expose the verify URL so e2e can complete the flow.
  const body: Record<string, unknown> = { ok: true };
  if (process.env.E2E_MAGIC_LINK_DEV === "1") {
    body.devUrl = verifyUrl;
  }
  return NextResponse.json(body, { status: 200 });
}
