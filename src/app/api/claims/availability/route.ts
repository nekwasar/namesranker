import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/claims/availability";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Public live-availability check (spec §2.7): powers the scarcity copy
 * ("`john-smith` is still available. Claim it before someone else does.")
 * and the onboarding variant picker. Optional `profession` returns keyword
 * variants for that profession (spec §2.6).
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const profession = req.nextUrl.searchParams.get("profession");

  // Claim-flow reads are rate-limited per IP (spec §4.5) to stop scripted probing.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit(`claims:availability:ip:${ip}`, 60, 60);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 60 }, { status: 429 });
  }

  if (!name.trim()) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const result = await getAvailability(name, profession || null);
  return NextResponse.json(result);
}
