import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, magicLinkEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { config, magicLinkTokenTtlMs } from "@/lib/config";
import { generateRawToken, hashToken, buildVerifyUrl } from "@/lib/auth/magic-link";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Rate limit per email and per IP.
  const [emailLimit, ipLimit] = await Promise.all([
    rateLimit(`magic-link:email:${email}`, 3, 60),
    rateLimit(`magic-link:ip:${ip}`, 5, 60),
  ]);

  if (!emailLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 60 }, { status: 429 });
  }

  // Always create/upsert the user on request so tokens are tied to a real row.
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + magicLinkTokenTtlMs);

  await prisma.magicLinkToken.create({
    data: { tokenHash, email, expiresAt },
  });

  const verifyUrl = buildVerifyUrl(config.appUrl, rawToken);

  // Spec §9: new users go to /onboarding, returning users to /settings.
  const isNew = !user.onboardedAt;
  const finalUrl = new URL(verifyUrl);
  finalUrl.searchParams.set("next", isNew ? "/onboarding" : "/settings");

  await sendEmail(magicLinkEmail(email, finalUrl.toString()));

  // Anti-enumeration: identical response whether or not the email exists.
  // In dev/test only, return the URL so local e2e tests can complete the flow.
  const body: Record<string, unknown> = { ok: true };
  if (process.env.NODE_ENV !== "production") {
    body.devUrl = finalUrl.toString();
  }
  return NextResponse.json(body, { status: 200 });
}
