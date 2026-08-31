import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { setCustomDomain, removeCustomDomain } from "@/lib/custom-domain";
import { ClaimError } from "@/lib/claims/claim";

export const runtime = "nodejs";

const setSchema = z.object({
  pageId: z.string().min(1).max(100),
  domain: z.string().min(1).max(253),
});

/** Attach a custom domain to a page (premium). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = setSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    const result = await setCustomDomain(session.sub, parsed.data.pageId, parsed.data.domain);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ClaimError) {
      const status = err.code === "premium_required" ? 403 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}

/** Detach a custom domain from a page. */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const pageId = req.nextUrl.searchParams.get("pageId");
  if (!pageId) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    await removeCustomDomain(session.sub, pageId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ClaimError && err.code === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw err;
  }
}
