import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { requireAdminUser } from "@/lib/admin/auth";
import { setPageStatus, AdminError } from "@/lib/admin";

export const runtime = "nodejs";

const statusSchema = z.object({
  status: z.enum(["LIVE", "REJECTED"]),
  note: z.string().max(2000).optional(),
});

/** List pages for moderation, newest first, pending/draft first. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await requireAdminUser(session.sub);
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const pages = await prisma.page.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { owner: { select: { email: true } } },
    take: 200,
  });
  return NextResponse.json({ pages });
}

/** Approve / reject a page (write AuditLog). */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await requireAdminUser(session.sub);
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const pageId = req.nextUrl.searchParams.get("id");
  if (!pageId) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    const page = await setPageStatus(session.sub, pageId, parsed.data.status, parsed.data.note);
    return NextResponse.json({ ok: true, page });
  } catch (err) {
    if (err instanceof AdminError) {
      const status = err.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
