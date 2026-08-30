import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { saveSeo } from "@/lib/settings";
import { ClaimError } from "@/lib/claims/claim";

export const runtime = "nodejs";

const bodySchema = z.object({
  pageId: z.string().min(1),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(400).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  }

  try {
    const { seoScore } = await saveSeo(session.sub, parsed.data.pageId, {
      metaTitle: parsed.data.metaTitle,
      metaDescription: parsed.data.metaDescription,
    });
    return NextResponse.json({ ok: true, seoScore });
  } catch (err) {
    if (err instanceof ClaimError && err.code === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw err;
  }
}
