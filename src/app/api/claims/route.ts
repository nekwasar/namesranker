import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { claimName, ClaimError } from "@/lib/claims/claim";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  keyword: z.string().min(1).max(50).optional().nullable(),
  customSlug: z.string().min(1).max(50).optional().nullable(),
});

const errorStatus: Record<string, number> = {
  invalid_name: 400,
  invalid_custom_slug: 400,
  invalid_slug: 400,
  invalid_keyword: 400,
  connector_limit: 400,
  one_word_premium: 403,
  custom_slug_premium_required: 403,
  premium_required: 403,
  already_claimed: 409,
  keyword_required: 409,
  no_slug_available: 409,
  path_taken: 409,
  not_found: 404,
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Spec §4.5: rate limit claims per user and per IP.
  const [userLimit, ipLimit] = await Promise.all([
    rateLimit(`claims:user:${session.sub}`, 10, 3600),
    rateLimit(`claims:ip:${ip}`, 30, 3600),
  ]);
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: 3600 }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  try {
    const { claim, pageUrl } = await claimName({
      userId: session.sub,
      email: session.email,
      name: parsed.data.name,
      keyword: parsed.data.keyword ?? null,
      customSlug: parsed.data.customSlug ?? null,
    });
    return NextResponse.json(
      {
        ok: true,
        claim: {
          id: claim.id,
          slug: claim.slug,
          type: claim.type,
          status: claim.status,
          wordCount: claim.wordCount,
        },
        pageUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ClaimError) {
      return NextResponse.json({ error: err.code }, { status: errorStatus[err.code] ?? 400 });
    }
    throw err;
  }
}
