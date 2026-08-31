import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { releaseOneWordClaims, writeBillingAudit } from "@/lib/billing/service";
import { config } from "@/lib/config";

export const runtime = "nodejs";

/** External-cron sweep for expired yearly graces (spec §3.13). */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const key = auth?.replace(/^Bearer\s+/i, "") ?? auth ?? "";
  if (!config.cronSecret || key !== config.cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const expired = await prisma.nameClaim.findMany({
    where: { status: "PENDING_RELEASE", graceUntil: { lte: new Date() } },
    select: { id: true, claimedById: true, slug: true },
  });

  let released = 0;
  for (const claim of expired) {
    await releaseOneWordClaims(claim.claimedById);
    await writeBillingAudit(claim.claimedById, "lapse.released", {
      slug: claim.slug,
      claimId: claim.id,
    });
    released++;
  }

  return NextResponse.json({ ok: true, expired: expired.length, released });
}
