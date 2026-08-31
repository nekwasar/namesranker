import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { requireAdminUser } from "@/lib/admin/auth";
import { setShowcaseStatus, AdminError } from "@/lib/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  status: z.enum(["LIVE", "REJECTED"]),
  note: z.string().max(2000).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await requireAdminUser(session.sub)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const entries = await prisma.showcaseEntry.findMany({
    orderBy: { createdAt: "desc" },
    include: { page: { select: { path: true, title: true, ownerId: true } } },
    take: 200,
  });
  return NextResponse.json({ entries });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await requireAdminUser(session.sub)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const entryId = req.nextUrl.searchParams.get("id");
  if (!entryId) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    const entry = await setShowcaseStatus(
      session.sub,
      entryId,
      parsed.data.status,
      parsed.data.note
    );
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    if (err instanceof AdminError) {
      const status = err.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
