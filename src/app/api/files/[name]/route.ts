import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { isSafeUploadName, mimeForUploadName } from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * Serves self-hosted uploads from disk. Names are strictly validated
 * (server-generated UUID + known image extension) so no path traversal or
 * arbitrary file reads are possible. Files are content-addressed by UUID, so
 * responses are safe to cache long-term.
 */
export async function GET(_req: NextRequest, { params }: { params: { name: string } }) {
  const { name } = params;
  if (!isSafeUploadName(name)) {
    return new NextResponse("not found", { status: 404 });
  }

  const mime = mimeForUploadName(name);
  if (!mime) {
    return new NextResponse("not found", { status: 404 });
  }

  try {
    const buf = await fs.readFile(path.join(process.cwd(), config.uploads.dir, name));
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
