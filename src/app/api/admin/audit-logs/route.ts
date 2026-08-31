import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { requireAdminUser } from "@/lib/admin/auth";

export const runtime = "nodejs";

/** Audit log viewer — most recent moderation actions first. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await requireAdminUser(session.sub)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { email: true } } },
    take: 100,
  });
  return NextResponse.json({ logs });
}
