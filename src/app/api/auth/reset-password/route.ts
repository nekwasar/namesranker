import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword, checkPasswordStrength } from "@/lib/auth/password";
import { consumeAuthToken, TOKEN_PURPOSES } from "@/lib/auth/tokens";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const strength = checkPasswordStrength(password);
  if (!strength.valid) {
    return NextResponse.json(
      { error: "weak_password", reasons: strength.reasons },
      { status: 400 }
    );
  }

  const limit = await rateLimit(`reset:ip:${ip}`, 10, 600);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 600 }, { status: 429 });
  }

  const result = await consumeAuthToken(token, TOKEN_PURPOSES.PASSWORD_RESET);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await prisma.user.update({
    where: { email: result.email },
    data: { passwordHash: hashPassword(password) },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
