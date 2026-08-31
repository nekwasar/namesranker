import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { refreshAnalytics } from "@/lib/gsc/links";
import { ClaimError } from "@/lib/claims/claim";

export const runtime = "nodejs";

/** Pulls fresh Search Analytics for one of the user's links. */
export async function POST(_req: Request, { params }: { params: { linkId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    let result;
    if (process.env.E2E_GSC_DEV === "1") {
      // DEV-ONLY fabricated analytics so e2e can verify the dashboard rendering.
      result = {
        rows: [
          { query: "alex morgan", clicks: 42, impressions: 210, ctr: 0.2, position: 3.1 },
          { query: "alex morgan designer", clicks: 18, impressions: 120, ctr: 0.15, position: 4.4 },
        ],
        totals: { clicks: 60, impressions: 330, ctr: 0.18, position: 3.7 },
        window: { startDate: "2026-06-01", endDate: "2026-08-31" },
      };
      void refreshAnalytics;
    } else {
      result = await refreshAnalytics(session.sub, params.linkId);
    }
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    if (err instanceof ClaimError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === "not_found" ? 404 : 400 }
      );
    }
    const e = err as { code?: string };
    if (e.code === "search_console_auth_failed") {
      return NextResponse.json(
        {
          error: "search_console_auth_failed",
          message: "Search Console access expired — please reconnect.",
        },
        { status: 403 }
      );
    }
    console.error("GSC refresh failed", err);
    return NextResponse.json({ error: "refresh_failed" }, { status: 502 });
  }
}
