import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { syncAutoConnectors } from "@/lib/imports/imports";

export const runtime = "nodejs";

/**
 * Protected external-cron target for import-connector auto-sync (M7,
 * milestones §3.8). Gated by the shared CRON_JOB_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!config.cronSecret || secret !== config.cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncAutoConnectors();
  return NextResponse.json({ ok: true, ...result });
}
