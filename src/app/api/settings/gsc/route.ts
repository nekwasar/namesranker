import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { buildAuthUrl } from "@/lib/gsc/google";
import { GSC_STATE_COOKIE } from "@/lib/gsc/constants";
import { getLinks, deleteLink } from "@/lib/gsc/links";
import { prisma } from "@/lib/db";
import { ClaimError } from "@/lib/claims/claim";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

const connectSchema = z.object({
  pageId: z.string().min(1).max(100),
});

/** Lists the user's Search Console links. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const links = await getLinks(session.sub);
  return NextResponse.json({ links });
}

/**
 * Begins the OAuth flow: picks the premium page to attach, stores a CSRF state
 * token in a cookie, and redirects to Google's consent screen.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { plan: true },
  });
  if (user?.plan !== "PREMIUM") {
    return NextResponse.json({ error: "premium_required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const page = await prisma.page.findFirst({
    where: { id: parsed.data.pageId, ownerId: session.sub },
    select: { id: true },
  });
  if (!page) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const state = randomBytes(24).toString("hex");
  const cookieStore = cookies();
  cookieStore.set(
    GSC_STATE_COOKIE,
    JSON.stringify({ state, pageId: page.id, userId: session.sub }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    }
  );

  return NextResponse.json({ url: buildAuthUrl({ state }) });
}

/** Disconnects a Search Console link owned by the user. */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const linkId = req.nextUrl.searchParams.get("id");
  if (!linkId) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    await deleteLink(session.sub, linkId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ClaimError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === "not_found" ? 404 : 400 }
      );
    }
    throw err;
  }
}
