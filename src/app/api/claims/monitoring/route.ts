import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getMonitoringRules, createMonitoringRule } from "@/lib/claims/monitoring";
import { ClaimError, isPremium } from "@/lib/claims/claim";

export const runtime = "nodejs";

const createSchema = z.object({
  nameToMonitor: z.string().min(1).max(100),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const rules = await getMonitoringRules(session.sub);
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { plan: true },
    });
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const rule = await createMonitoringRule(
      session.sub,
      parsed.data.nameToMonitor,
      isPremium(user)
    );
    return NextResponse.json({ ok: true, rule }, { status: 201 });
  } catch (err) {
    if (err instanceof ClaimError) {
      const status = err.code === "premium_required" ? 403 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
