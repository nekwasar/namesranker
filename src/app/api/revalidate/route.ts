import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

/**
 * On-demand ISR revalidation. Called internally (admin, settings, cron) whenever
 * a public page's content changes, so the hub-and-spoke pages update promptly
 * instead of waiting for the 3600s ISR window.
 *
 * Protected by a shared secret (CRON_JOB_SECRET) since it is invoked server-side.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_JOB_SECRET ?? ""}`;
  if (!process.env.CRON_JOB_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { paths } = (await req.json().catch(() => ({}))) as { paths?: string[] };
  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: "paths_required" }, { status: 400 });
  }

  // User pages live under the `[...path]` catch-all, so revalidate the route
  // itself (per-path tags are never emitted by dynamic routes). Keep the
  // given paths as page-level no-ops for safety, and refresh home + sitemap.
  for (const p of paths) {
    revalidatePath(`/${p}`, "page");
  }
  revalidatePath("/[...path]", "page");
  revalidatePath("/", "page");

  return NextResponse.json({ revalidated: true });
}
