import { NextRequest, NextResponse } from "next/server";
import { getKeywords } from "@/lib/claims/availability";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Curated profession → keyword list (spec §2.6). No free-text slugs — ever. */
export async function GET(req: NextRequest) {
  const profession = req.nextUrl.searchParams.get("profession");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit(`claims:keywords:ip:${ip}`, 60, 60);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 60 }, { status: 429 });
  }

  const professions = await getKeywords(profession || null);
  return NextResponse.json({ professions });
}
