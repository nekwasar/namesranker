import { NextRequest, NextResponse } from "next/server";
import { getRecentClaims } from "@/lib/claims/availability";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** "Who claimed it recently" feed (spec §3.4) — newest claims first. */
export async function GET(req: NextRequest) {
  const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? 6);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), 20) : 6;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = await rateLimit(`claims:recent:ip:${ip}`, 60, 60);
  if (!rate.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 60 }, { status: 429 });
  }

  const claims = await getRecentClaims(limit);
  return NextResponse.json({
    claims: claims.map((c) => ({ slug: c.slug, ago: c.ago, claimedAt: c.claimedAt.toISOString() })),
  });
}
