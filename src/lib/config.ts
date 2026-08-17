/**
 * Centralized configuration. Every domain/env-dependent value lives here so
 * the premium domain (`ra-nk.me`) can be swapped cleanly via env (see spec §6).
 */

export const config = {
  baseDomain: process.env.BASE_DOMAIN ?? "namesranker.com",
  raNkDomain: process.env.RA_NK_DOMAIN ?? "ra-nk.me",
  appUrl:
    process.env.NODE_ENV === "production"
      ? `https://${process.env.VERCEL_URL ?? process.env.BASE_DOMAIN ?? "namesranker.com"}`
      : (process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  brevo: {
    apiKey: process.env.BREVO_API_KEY ?? "",
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? "noreply@namesranker.com",
    senderName: process.env.BREVO_SENDER_NAME ?? "NamesRanker",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    priceMonthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
    priceAnnual: process.env.STRIPE_PRICE_ANNUAL ?? "",
    priceLifetime: process.env.STRIPE_PRICE_LIFETIME ?? "",
  },
  cronSecret: process.env.CRON_JOB_SECRET ?? "",
} as const;

export const magicLinkTokenTtlMs = 15 * 60 * 1000; // 15 minutes

export const annualGracePeriodDays = 30;
