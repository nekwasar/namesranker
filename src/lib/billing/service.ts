import { prisma } from "@/lib/db";
import { config, annualGracePeriodDays } from "@/lib/config";

/**
 * Billing entitlement service (M10, milestones §3.10 / spec §10).
 *
 * Stripe is the source of truth for charges; the webhook maps those events to
 * our `User` plan + subscription/customer ids (the WebhookTranslator). Lapse
 * transitions also live here and are driven by the external cron sweep.
 *
 * Model: `User.plan` = FREE | PREMIUM (source of truth for `isPremium`).
 * `stripeSubscriptionId`/`stripeCustomerId` record the backing subscription.
 */

/** Applies a successful checkout / renewal — idempotent, safe to call from multiple events. */
export async function applyEntitlement(params: {
  userId: string;
  email: string;
  plan?: "PREMIUM";
  subscriptionId?: string | null;
  customerId?: string | null;
  kind?: "recurring" | "lifetime";
  sessionId?: string | null;
}): Promise<void> {
  await prisma.user.update({
    where: { id: params.userId },
    data: {
      plan: params.plan ?? "PREMIUM",
      stripeCustomerId: params.customerId ?? undefined,
      stripeSubscriptionId: params.subscriptionId ?? undefined,
    },
  });
  await writeBillingAudit(params.userId, "billing.entitled", {
    kind: params.kind ?? "recurring",
    sessionId: params.sessionId,
  });
}

/** Clears premium entitlement after a lapse/cancel (subscription-level). */
export async function revokeSubscription(
  userId: string,
  subscriptionId: string | null,
  reason: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { plan: "FREE", stripeSubscriptionId: null },
  });
  await writeBillingAudit(userId, "billing.revoked", { subscriptionId, reason });
}

export async function writeBillingAudit(
  userId: string | null,
  action: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: userId ?? undefined,
      action,
      entityType: "User",
      entityId: userId ?? undefined,
      metadata: metadata as object,
    },
  });
}

/**
 * Monthly lapse / yearly grace expiry: release the one-word slug immediately
 * (spec §2.4). Keyword/custom/two-word slugs persist. Returns # released.
 */
export async function releaseOneWordClaims(userId: string): Promise<number> {
  const result = await prisma.nameClaim.updateMany({
    where: {
      claimedById: userId,
      status: { in: ["CLAIMED", "PROTECTED", "PENDING_RELEASE"] },
      wordCount: 1,
    },
    data: { status: "RELEASED", graceUntil: null },
  });
  return result.count;
}

/** Yearly lapse: open a 30-day grace window on one-word claims (spec §2.4). */
export async function startGracePeriod(userId: string): Promise<Date> {
  const graceUntil = new Date(Date.now() + annualGracePeriodDays * 24 * 60 * 60 * 1000);
  await prisma.nameClaim.updateMany({
    where: { claimedById: userId, status: { in: ["CLAIMED", "PROTECTED"] }, wordCount: 1 },
    data: { status: "PENDING_RELEASE", graceUntil },
  });
  await writeBillingAudit(userId, "billing.grace_start", { graceUntil: graceUntil.toISOString() });
  return graceUntil;
}

/** Lapse emails (spec §3.11 — monthly released now, yearly grace reminders). */
export function lapseEmail(to: string, opts: { reason: "now" | "grace" }) {
  const base = `https://${config.baseDomain}/pricing`;
  if (opts.reason === "now") {
    return {
      to,
      subject: "Your NamesRanker premium ended — your name is released",
      tags: ["lapse-now"],
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2>Your premium subscription has ended</h2>
          <p>Your one-word name is no longer protected and has been released to the pool so another person can claim it.</p>
          <p>Two-word and keyword slugs are unaffected. Rename or re-subscribe anytime: <a href="${base}">${base}</a></p>
        </div>
      `,
      text: `Your premium subscription has ended. Your one-word name is released to the pool; other slugs are unaffected. Re-subscribe: ${base}`,
    };
  }
  return {
    to,
    subject: `Your yearly plan lapses in ${annualGracePeriodDays} days`,
    tags: ["lapse-grace"],
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2>Your one-word name enters its grace period</h2>
        <p>Your yearly subscription has lapsed. Your one-word name stays yours for the next ${annualGracePeriodDays} days, then is released to the pool.</p>
        <p><a href="${base}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Renew premium</a></p>
      </div>
    `,
    text: `Your yearly plan lapses in ${annualGracePeriodDays} days. Your one-word name stays yours for the grace period then is released. Renew: ${base}`,
  };
}
