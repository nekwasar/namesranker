import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { updateSubPage, deleteSubPage } from "@/lib/settings";
import { ClaimError } from "@/lib/claims/claim";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  descriptor: z.string().max(200).nullable().optional(),
  metaTitle: z.string().max(200).nullable().optional(),
  metaDescription: z.string().max(400).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  }

  try {
    const page = await updateSubPage(session.sub, params.id, parsed.data);
    return NextResponse.json({ ok: true, page });
  } catch (err) {
    if (err instanceof ClaimError) {
      const status = err.code === "invalid_slug" ? 400 : 404;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    await deleteSubPage(session.sub, params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ClaimError) {
      const status = err.code === "invalid_slug" ? 400 : 404;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
