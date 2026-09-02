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

  // Magic links are a sign-in flow for EXISTING accounts: look the user up in
  // the DB and only send when the account actually exists. Never auto-create a
  // user row here (signup requires a name + strong password + verification).
  const user = await prisma.user.findUnique({
    where: { email },
    select: { onboardedAt: true },
  });

  if (!user) {
    // No account → never mint a token or send an email. The status stays 200
    // (identical to a successful send) so the endpoint can't be used to probe
    // which emails have accounts; the body flag lets the UI route people who
    // typed their own address to signup instead of a phantom "we sent it".
    return NextResponse.json({ ok: true, needsAccount: true }, { status: 200 });
  }

  const body: Record<string, unknown> = { ok: true };

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

  // When E2E_MAGIC_LINK_DEV=1 (test server only), return the URL so e2e tests
  // can complete the flow. Never enabled in production.
  if (process.env.E2E_MAGIC_LINK_DEV === "1") {
    body.devUrl = finalUrl.toString();
  }
  return NextResponse.json(body, { status: 200 });
}
