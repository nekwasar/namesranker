/**
 * Centralized configuration. Every domain/env-dependent value lives here so
 * the premium domain (`ra-nk.me`) can be swapped cleanly via env (see spec §6).
 */

const env = (key: string, fallback = ""): string => {
  const value = process.env[key];
  return value ? value : fallback;
};

export const config = {
  baseDomain: env("BASE_DOMAIN", "namesranker.com"),
  raNkDomain: env("RA_NK_DOMAIN", "ra-nk.me"),
  appUrl: env("NEXTAUTH_URL")
    ? env("NEXTAUTH_URL")
    : `https://${env("VERCEL_URL") || env("BASE_DOMAIN", "namesranker.com")}`,
  brevo: {
    apiKey: env("BREVO_API_KEY"),
    senderEmail: env("BREVO_SENDER_EMAIL", "noreply@namesranker.com"),
    senderName: env("BREVO_SENDER_NAME", "NamesRanker"),
  },
  stripe: {
    secretKey: env("STRIPE_SECRET_KEY"),
    webhookSecret: env("STRIPE_WEBHOOK_SECRET"),
    priceMonthly: env("STRIPE_PRICE_MONTHLY"),
    priceAnnual: env("STRIPE_PRICE_ANNUAL"),
    priceLifetime: env("STRIPE_PRICE_LIFETIME"),
  },
  cronSecret: env("CRON_JOB_SECRET"),
} as const;

export const magicLinkTokenTtlMs = 15 * 60 * 1000; // 15 minutes

export const annualGracePeriodDays = 30;
