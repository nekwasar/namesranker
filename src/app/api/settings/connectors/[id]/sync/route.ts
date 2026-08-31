import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { syncConnector } from "@/lib/imports/imports";

export const runtime = "nodejs";

/** Manual "sync now" for one of the user's connectors (spec §5.3). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const connector = await prisma.importConnector.findFirst({
    where: { id: params.id, page: { ownerId: session.sub } },
    select: { id: true },
  });
  if (!connector) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await syncConnector(connector.id);
  return NextResponse.json({ ok: result.ok, result });
}
