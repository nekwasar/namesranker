import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { requireAdminUser } from "@/lib/admin/auth";
import { deleteImportedContent, AdminError } from "@/lib/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["delete_content"]),
  contentId: z.string().optional(),
});

/** List connectors + their imported content for spam review. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await requireAdminUser(session.sub)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const connectors = await prisma.importConnector.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      contents: { orderBy: { createdAt: "desc" }, take: 100 },
      page: { select: { path: true, title: true } },
    },
    take: 100,
  });
  return NextResponse.json({ connectors });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await requireAdminUser(session.sub)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    if (parsed.data.action === "delete_content") {
      if (!parsed.data.contentId)
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
      await deleteImportedContent(session.sub, parsed.data.contentId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  } catch (err) {
    if (err instanceof AdminError) {
      const status = err.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
