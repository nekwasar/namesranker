import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  applyEntitlement,
  releaseOneWordClaims,
  startGracePeriod,
  revokeSubscription,
  writeBillingAudit,
  lapseEmail,
} from "@/lib/billing/service";
import { constructWebhookEvent } from "@/lib/billing/stripe";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Stripe webhook (M10, milestones §3.10). Verifies the signature, then maps
 * events to entitlement changes. Always responds 200 to Stripe except on
 * signature failure (so Stripe retries). Unknown events for unrelated features
 * are ignored (return 200 with `ignored`).
 */

type Event = Stripe.Event;

async function requireUserByClientId(id: string | undefined | null) {
  if (!id) return null;
  // client_reference_id / metadata carry our user id at checkout.
  const user = await prisma.user.findUnique({
    where: { id: id.slice(0, 100) },
    select: { id: true, email: true },
  });
  return user;
}

async function handleSessionCompleted(event: Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId =
    (session.client_reference_id as string) || (session.metadata?.userId as string) || null;
  const user = await requireUserByClientId(userId);
  if (!user) return "user_not_found";

  const customerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  const cycle = session.metadata?.cycle ?? null;

  await applyEntitlement({
    userId: user.id,
    email: user.email,
    plan: "PREMIUM",
    customerId,
    subscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : (session.subscription?.id ?? null),
    kind: cycle === "lifetime" ? "lifetime" : "recurring",
    sessionId: session.id ?? null,
  });
  return "entitled";
}

async function handleSubscriptionDeleted(event: Event) {
  const sub = event.data.object as Stripe.Subscription;
  const userId = (sub.metadata?.userId as string) || null;
  const user = await requireUserByClientId(userId);
  if (!user) return "user_not_found";

  // Identify billing cadence from the plan for lapse handling. Lifetime is a
  // one-time payment (no subscription), so it never reaches here.
  const billingPeriod = sub.items.data[0]?.price?.recurring?.interval ?? null;

  await revokeSubscription(user.id, sub.id ?? null, "subscription_deleted");

  if (billingPeriod === "month") {
    // Monthly: release the one-word slug immediately (spec §2.4).
    await releaseOneWordClaims(user.id);
  } else {
    // Annual: open a 30-day grace window (spec §2.4).
    await startGracePeriod(user.id);
  }

  // Email the user so they know the consequence of the lapse (spec §3.11).
  try {
    await sendEmail(
      lapseEmail(user.email, { reason: billingPeriod === "month" ? "now" : "grace" })
    );
  } catch (err) {
    console.error("lapse email failed", err);
  }
  return "revoked";
}

async function handleSubscriptionUpdated(event: Event) {
  const sub = event.data.object as Stripe.Subscription;
  if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
    const userId = (sub.metadata?.userId as string) || null;
    const user = await requireUserByClientId(userId);
    if (user) {
      await applyEntitlement({
        userId: user.id,
        email: user.email,
        plan: "PREMIUM",
        customerId: typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
        subscriptionId: sub.id ?? null,
        kind: "recurring",
      });
      return "entitled";
    }
    return "user_not_found";
  }
  if (sub.status === "unpaid" || sub.status === "canceled" || sub.status === "incomplete_expired") {
    return handleSubscriptionDeleted(event);
  }
  return "ignored";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? undefined;

  const event = constructWebhookEvent(body, sig);
  if (!event) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    let handled = "ignored";
    switch (event.type) {
      case "checkout.session.completed":
        handled = await handleSessionCompleted(event);
        break;
      case "customer.subscription.deleted":
        handled = await handleSubscriptionDeleted(event);
        break;
      case "customer.subscription.updated":
        handled = await handleSubscriptionUpdated(event);
        break;
      case "checkout.session.expired":
        handled = "ignored";
        break;
      default:
        handled = "ignored";
    }
    await writeBillingAudit("system", `stripe:${event.type}`, { id: event.id ?? null, handled });
    return NextResponse.json({ received: true, handled });
  } catch (err) {
    console.error("Stripe webhook handling failed", err);
    await writeBillingAudit("system", `stripe:${event.type}:error`, { id: event.id ?? null });
    // Log the error but still ACK so Stripe doesn't infinitely retry a buggy build.
    return NextResponse.json({ received: true, handled: "error" });
  }
}
