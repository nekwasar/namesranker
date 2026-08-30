import { prisma } from "@/lib/db";
import { ClaimError } from "@/lib/claims/claim";
import { normalizeName } from "@/lib/claims/slug";

/**
 * Name monitoring (spec §2.3, premium): a user watches for slugs matching a name
 * and gets alerts when one is claimed. Rule CRUD lives here; the periodic scan
 * that fires alerts is part of the external cron work (milestones §3.13, M12).
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
