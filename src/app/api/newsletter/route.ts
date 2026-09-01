import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
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

  const limit = await rateLimit(`newsletter:ip:${ip}`, 5, 300);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 300 }, { status: 429 });
  }

  // Idempotent: a repeat signup is a no-op, not an error.
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: {},
    create: { email, source: "homepage" },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
