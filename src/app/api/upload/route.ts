import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getSession } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";
import { sniffImageType, uploadFileName, isAllowedUploadSize } from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * Self-hosted image upload (no Vercel Blob). Accepts a multipart `file` field,
 * validates the real bytes (magic numbers — never the client's content-type),
 * enforces a size cap, and stores it under the configured upload dir with a
 * server-generated name. Returns a same-origin URL (`/uploads/<name>`) so the
 * photo works on the base domain and on custom domains alike.
 *
 * Rate-limited per user to keep disk usage sane (spec §4.5).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rl = await rateLimit(`upload:${session.sub}`, 30, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 }
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const candidate = form.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!isAllowedUploadSize(buf.length, config.uploads.maxBytes)) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const type = sniffImageType(buf);
  if (!type) {
    return NextResponse.json({ error: "not_an_image" }, { status: 415 });
  }

  const name = uploadFileName(type);
  const dir = path.join(process.cwd(), config.uploads.dir);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);
  } catch {
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }

  return NextResponse.json({
    url: `${config.uploads.urlPrefix}/${name}`,
  });
}
