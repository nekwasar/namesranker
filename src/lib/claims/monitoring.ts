import { prisma } from "@/lib/db";
import { sendEmail, monitoringAlertEmail } from "@/lib/email";
import { ClaimError } from "@/lib/claims/claim";
import { normalizeName, slugify } from "@/lib/claims/slug";

/**
 * Name monitoring (spec §2.3, premium): a user watches for slugs matching a name
 * and gets alerts when one is claimed. Rule CRUD lives here; the periodic scan
 * that fires alerts is run by the external cron (milestones §3.13 / scripts/cron/monitoring.ts).
 */

export async function getMonitoringRules(userId: string) {
  return prisma.nameMonitoringRule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, nameToMonitor: true, lastAlertAt: true, createdAt: true },
  });
}

export async function createMonitoringRule(
  userId: string,
  nameToMonitor: string,
  premium: boolean
) {
  if (!premium) throw new ClaimError("premium_required");
  const normalized = normalizeName(nameToMonitor);
  if (!normalized) throw new ClaimError("invalid_name");
  return prisma.nameMonitoringRule.create({
    data: { userId, nameToMonitor: normalized },
    select: { id: true, nameToMonitor: true, lastAlertAt: true, createdAt: true },
  });
}

export async function deleteMonitoringRule(userId: string, ruleId: string): Promise<void> {
  const rule = await prisma.nameMonitoringRule.findFirst({
    where: { id: ruleId, userId },
    select: { id: true },
  });
  if (!rule) throw new ClaimError("not_found");
  await prisma.nameMonitoringRule.delete({ where: { id: ruleId } });
}

/**
 * The periodic monitoring scan (spec §2.3 / milestones §3.13):
 * for every rule, find claims whose slug matches the watched name (the exact
 * slug or a keyword/numbered variant) and alert the owner once. The user is
 * alerted at most once per new claim — `lastAlertAt` records the last scan
 * that produced an alert, so a claim claimed after that point triggers a fresh
 * alert. Idempotent and safe to run on any cadence.
 */
export async function scanMonitoringAlerts(): Promise<{
  rulesChecked: number;
  alertsSent: number;
  failed: number;
}> {
  const rules = await prisma.nameMonitoringRule.findMany({
    include: { user: { select: { email: true } } },
  });

  let alertsSent = 0;
  let failed = 0;

  for (const rule of rules) {
    const base = slugify(rule.nameToMonitor);
    if (!base) continue;

    // Claims matching the watched name: exact slug or any variant under it.
    // Look back only as far as the last alert (or rule creation) so each new
    // claim is alerted once.
    const since = rule.lastAlertAt ?? rule.createdAt;
    const claims = await prisma.nameClaim.findMany({
      where: {
        status: { in: ["CLAIMED", "PROTECTED", "PENDING_RELEASE"] },
        claimedAt: { gt: since },
        OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }],
      },
      select: { slug: true },
      orderBy: { claimedAt: "asc" },
    });

    if (claims.length === 0) continue;

    try {
      await sendEmail(
        monitoringAlertEmail(
          rule.user.email,
          rule.nameToMonitor,
          claims.map((c) => c.slug)
        )
      );
      await prisma.nameMonitoringRule.update({
        where: { id: rule.id },
        data: { lastAlertAt: new Date() },
      });
      alertsSent++;
    } catch (err) {
      console.error(`Monitoring alert failed for rule ${rule.id}:`, err);
      failed++;
    }
  }

  return { rulesChecked: rules.length, alertsSent, failed };
}
