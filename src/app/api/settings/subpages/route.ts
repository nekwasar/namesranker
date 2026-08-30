import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createSubPage } from "@/lib/settings";
import { ClaimError } from "@/lib/claims/claim";

export const runtime = "nodejs";

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  segment: z.string().min(1).max(50),
  descriptor: z.string().max(200).optional().nullable(),
});

const errorStatus: Record<string, number> = {
  premium_required: 403,
  invalid_slug: 400,
  path_taken: 409,
  not_found: 404,
};

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
    const page = await createSubPage(session.sub, parsed.data);
    return NextResponse.json({ ok: true, page }, { status: 201 });
  } catch (err) {
    if (err instanceof ClaimError) {
      return NextResponse.json({ error: err.code }, { status: errorStatus[err.code] ?? 400 });
    }
    throw err;
  }
}
