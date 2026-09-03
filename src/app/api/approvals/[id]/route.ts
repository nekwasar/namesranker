import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { decideApproval } from "@/lib/agent/state";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const decided = await decideApproval(session.sub, params.id, parsed.data.action);
  if (!decided) {
    return NextResponse.json({ error: "not_pending" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
