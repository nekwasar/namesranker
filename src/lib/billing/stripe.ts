import Stripe from "stripe";
import { config } from "@/lib/config";

/**
 * Stripe SDK (M10, milestones §3.10). All Stripe access goes through here so
 * the API version, key, and webhook secret live in one place. Every function
 * is a thin typed wrapper around the SDK; billing logic lives in
 * `src/lib/billing/` and webhook handling in `src/app/api/billing/webhook`.
 */

function getStripe(): Stripe {
  if (!config.stripe.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(config.stripe.secretKey, {
    apiVersion: "2026-08-26.dahlia",
  });
}

/** Lazily-initialized singleton (config reads env at module load). */
let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) _stripe = getStripe();
  return _stripe;
}

/**
 * Constructs a raw Stripe event from a webhook payload, verifying the
 * signature. Returns null when verification fails (caller must 400).
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  sig: string | undefined
): Stripe.Event | null {
  const secret = config.stripe.webhookSecret;
  if (!secret || !sig) return null;
  try {
    return stripe().webhooks.constructEvent(payload, sig, secret);
  } catch {
    return null;
  }
}

const PRICE_IDS = {
  monthly: config.stripe.priceMonthly,
  annual: config.stripe.priceAnnual,
  lifetime: config.stripe.priceLifetime,
};

/** A billing cycle the user picked at checkout. */
export type BillingCycle = keyof typeof PRICE_IDS;

export function isBillingCycle(v: unknown): v is BillingCycle {
  return v === "monthly" || v === "annual" || v === "lifetime";
}

/**
 * Creates a Stripe Checkout Session for the requested plan, tied to the user
 * so the webhook can attribute the purchase. `customerEmail` seeds the Stripe
 * customer for existing users; mode is "subscription" for monthly/annual and
 * "payment" for the one-time lifetime purchase.
 */
export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  cycle: BillingCycle;
  successPath?: string;
  cancelPath?: string;
}) {
  const price = PRICE_IDS[params.cycle];
  if (!price) throw new Error(`No Stripe price id configured for ${params.cycle}`);

  const mode = params.cycle === "lifetime" ? "payment" : "subscription";
  const successUrl = `${config.appUrl}${params.successPath ?? "/settings?upgrade=success"}`;
  const cancelUrl = `${config.appUrl}${params.cancelPath ?? "/pricing?canceled=1"}`;

  const session = await stripe().checkout.sessions.create({
    mode,
    line_items: [{ price, quantity: 1 }],
    customer_email: params.email,
    client_reference_id: params.userId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: params.userId, cycle: params.cycle },
    ...(mode === "subscription"
      ? {
          subscription_data: {
            metadata: { userId: params.userId, cycle: params.cycle },
          },
        }
      : {}),
  });

  return { id: session.id, url: session.url ?? null, mode };
}

/** Opens the Stripe billing portal for an existing customer. */
export async function createBillingPortalSession(params: {
  customerId: string;
  returnPath?: string;
}) {
  const session = await stripe().billingPortal.sessions.create({
    customer: params.customerId,
    return_url: `${config.appUrl}${params.returnPath ?? "/settings"}`,
  });
  return { url: session.url };
}

export { getStripe }; // internal
