import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { sendOnboardingNudges } from "@/lib/nudges";

export const runtime = "nodejs";

/**
 * Protected external-cron target for the 24h onboarding nudge (milestones §3.13).
 * Gated by the shared CRON_JOB_SECRET to stop anyone triggering it publicly.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!config.cronSecret || secret !== config.cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendOnboardingNudges();
  return NextResponse.json({ ok: true, ...result });
}
