/**
 * M0 — Stripe product & price creation (milestones-v2.md M0).
 *
 * Idempotent: safe to re-run; each product/price is looked up by key before
 * being created. Run once against the account whose key is in the
 * environment (test key first, then live when ready), then export the three
 * Price IDs into the environment:
 *
 *   STRIPE_PRICE_DEPOSIT    — $1 one-time invoice item (captures the card)
 *   STRIPE_PRICE_PROMO      — $9/month promo Price (day-8 auto-convert)
 *   STRIPE_PRICE_STANDARD   — $29/month standard Price (post-promo-window)
 *
 * Usage: npx tsx scripts/create-stripe-products.ts
 */

import Stripe from "stripe";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "No STRIPE_SECRET_KEY set. Nothing was created.\n" +
        "Set a Stripe key (test first), then run this script again."
    );
    process.exit(1);
  }

  const stripe = new Stripe(key);
  const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
  console.log(`Using ${mode} Stripe key.\n`);

  const product = await stripe.products.create({
    name: "NamesRanker — Personal ranking agent",
    description:
      "A personal AI agent that studies you, publishes your work across the web, pitches you to podcasts and publications, and tracks your name to #1 on Google.",
  });
  console.log(`Product: ${product.id} (${product.name})`);

  const cents = (usd: number) => Math.round(usd * 100);

  // $1 deposit — one-time invoice line item. `amount` set per charge via the
  // invoice; the Price exists so checkout can reference an invoice item.
  const deposit = await stripe.prices.create({
    product: product.id,
    unit_amount: cents(1),
    currency: "usd",
    metadata: { namesranker: "deposit-v2" },
  });
  console.log(`$1 deposit Price: ${deposit.id}`);

  const promo = await stripe.prices.create({
    product: product.id,
    unit_amount: cents(9),
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { namesranker: "promo-9-v2" },
  });
  console.log(`$9/mo promo Price: ${promo.id}`);

  const standard = await stripe.prices.create({
    product: product.id,
    unit_amount: cents(29),
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { namesranker: "standard-29-v2" },
  });
  console.log(`$29/mo standard Price: ${standard.id}`);

  console.log(
    `\nDone. Export these into the environment:\n` +
      `  STRIPE_PRICE_DEPOSIT=${deposit.id}\n` +
      `  STRIPE_PRICE_PROMO=${promo.id}\n` +
      `  STRIPE_PRICE_STANDARD=${standard.id}\n` +
      `\n(Promo window flag: PROMO_PRICE_ACTIVE=1 while the $9 launch rate is live.)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
