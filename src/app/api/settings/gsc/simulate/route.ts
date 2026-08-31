import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { saveLink } from "@/lib/gsc/links";

export const runtime = "nodejs";

const bodySchema = z.object({
  pageId: z.string().min(1).max(100),
});

/**
 * DEV-ONLY simulator for e2e tests: records a Search Console link as if the
 * OAuth exchange succeeded, so the rest of the M11 flow can be tested without
 * Google credentials. Guarded by E2E_GSC_DEV=1 (never set in production).
 */
export async function POST(req: NextRequest) {
  if (process.env.E2E_GSC_DEV !== "1") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const session = await (await import("@/lib/auth/session")).getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const page = await prisma.page.findFirst({
    where: { id: parsed.data.pageId, ownerId: session.sub },
    select: { id: true },
  });
  if (!page) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await saveLink({
    userId: session.sub,
    pageId: page.id,
    propertyUrl: `sc-domain:${process.env.BASE_DOMAIN ?? "namesranker.com"}`,
    refreshToken: `fake_refresh_${page.id}`,
  });
  return NextResponse.json({ ok: true });
}
