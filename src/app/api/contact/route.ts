import { NextRequest, NextResponse } from "next/server";
import { sendEmail, contactFormEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const limit = await rateLimit(`contact:ip:${ip}`, 5, 600);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 600 }, { status: 429 });
  }

  const { name, email, subject, message } = parsed.data;
  await sendEmail({ ...contactFormEmail(name, email, subject, message), replyTo: email });

  return NextResponse.json({ ok: true }, { status: 200 });
}
