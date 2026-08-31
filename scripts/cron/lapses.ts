import "dotenv/config";
import { prisma } from "@/lib/db";
import { releaseOneWordClaims, writeBillingAudit } from "@/lib/billing/service";

/**
 * M10 lapse sweep: finds users whose premium has lapsed and applies the policy
 * (spec §2.4 / milestones §3.10).
 *   - Monthly subscriptions: revoked at webhook time (subscription.deleted) which
 *     releases the one-word slug immediately.
 *   - Yearly subscriptions: enter a 30-day grace; a daily sweep releases any
 *     claim whose graceUntil has passed.
 *
 * Run via external cron: `npm run cron:lapses` (also POST /api/cron/lapses).
 */
async function main() {
  // Release one-word slugs for yearly-lapse graces that have expired.
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

  console.log(`Swept ${expired.length} expired grace(s) → ${released} one-word slug(s) released.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
