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
    senderEmail: env("BREVO_SENDER_EMAIL", "no-reply@namesranker.com"),
    senderName: env("BREVO_SENDER_NAME", "NamesRanker"),
  },
  stripe: {
    secretKey: env("STRIPE_SECRET_KEY"),
    webhookSecret: env("STRIPE_WEBHOOK_SECRET"),
    priceMonthly: env("STRIPE_PRICE_MONTHLY"),
    priceAnnual: env("STRIPE_PRICE_ANNUAL"),
    priceLifetime: env("STRIPE_PRICE_LIFETIME"),
  },
  contact: {
    email: env("CONTACT_EMAIL", "hello@namesranker.com"),
  },
  cronSecret: env("CRON_JOB_SECRET"),
  /** Comma-separated emails given admin access to /admin (M9). */
  adminEmails: env("ADMIN_EMAILS")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  imports: {
    githubToken: env("GITHUB_TOKEN"),
    youtubeApiKey: env("YOUTUBE_API_KEY"),
  },
  google: {
    searchConsoleClientId: env("GOOGLE_SEARCH_CONSOLE_CLIENT_ID"),
    searchConsoleClientSecret: env("GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET"),
  },
  uploads: {
    /** Directory (relative to project root) where uploaded files are stored. */
    dir: env("UPLOAD_DIR", "uploads"),
    /** Public URL prefix for uploaded files (served by /api/files/[...]). */
    urlPrefix: env("UPLOAD_URL_PREFIX", "/api/files"),
    /** Max image size accepted (5 MB). */
    maxBytes: 5 * 1024 * 1024,
  },
} as const;

export const magicLinkTokenTtlMs = 15 * 60 * 1000; // 15 minutes

export const annualGracePeriodDays = 30;
