import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { verifyCustomDomain } from "@/lib/custom-domain";
import { ClaimError } from "@/lib/claims/claim";

export const runtime = "nodejs";

const verifySchema = z.object({
  pageId: z.string().min(1).max(100),
});

/** Re-checks the domain's DNS TXT record and marks it verified when it matches. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    const result = await verifyCustomDomain(session.sub, parsed.data.pageId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ClaimError) {
      if (err.code === "verification_failed") {
        return NextResponse.json(
          { error: "verification_failed", message: "TXT record not found or doesn't match yet." },
          { status: 422 }
        );
      }
      if (err.code === "premium_required")
        return NextResponse.json({ error: err.code }, { status: 403 });
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }
}
