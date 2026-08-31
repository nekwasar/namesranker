import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { scanMonitoringAlerts } from "@/lib/claims/monitoring";

export const runtime = "nodejs";

/** Protected external-cron target for name-monitoring alerts (milestones §3.13). */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!config.cronSecret || secret !== config.cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await scanMonitoringAlerts();
  return NextResponse.json({ ok: true, ...result });
}
