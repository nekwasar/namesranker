import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { addConnector } from "@/lib/settings";
import { ClaimError } from "@/lib/claims/claim";

export const runtime = "nodejs";

const bodySchema = z.object({
  pageId: z.string().min(1),
  type: z.enum(["RSS", "GITHUB", "YOUTUBE"]),
  externalUrl: z.string().url(),
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
    const connector = await addConnector(session.sub, parsed.data.pageId, {
      type: parsed.data.type,
      externalUrl: parsed.data.externalUrl,
    });
    return NextResponse.json({ ok: true, connector }, { status: 201 });
  } catch (err) {
    if (err instanceof ClaimError) {
      const status = err.code === "not_found" ? 404 : err.code === "connector_limit" ? 400 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
