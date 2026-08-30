import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { skipStep } from "@/lib/onboarding";

export const runtime = "nodejs";

const bodySchema = z.object({ step: z.number().int().min(2).max(7) });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_step" }, { status: 400 });
  }

  const nextStep = await skipStep(session.sub, parsed.data.step);
  return NextResponse.json({ ok: true, nextStep });
}
