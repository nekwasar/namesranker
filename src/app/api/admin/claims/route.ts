import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { requireAdminUser } from "@/lib/admin/auth";
import { releaseClaim, overrideClaimStatus, AdminError } from "@/lib/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["release", "override"]),
  status: z.enum(["CLAIMED", "PROTECTED", "PENDING_RELEASE", "RELEASED"]).optional(),
  note: z.string().max(2000).optional(),
});

/** List claims (for dispute resolution + overrides), newest first. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await requireAdminUser(session.sub)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const claims = await prisma.nameClaim.findMany({
    orderBy: { claimedAt: "desc" },
    include: { claimedBy: { select: { email: true } } },
    take: 300,
  });
  return NextResponse.json({ claims });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await requireAdminUser(session.sub)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const claimId = req.nextUrl.searchParams.get("id");
  if (!claimId) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    if (parsed.data.action === "release") {
      const claim = await releaseClaim(session.sub, claimId, parsed.data.note);
      return NextResponse.json({ ok: true, claim });
    }
    if (!parsed.data.status) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    const claim = await overrideClaimStatus(
      session.sub,
      claimId,
      parsed.data.status,
      parsed.data.note
    );
    return NextResponse.json({ ok: true, claim });
  } catch (err) {
    if (err instanceof AdminError) {
      const status = err.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
