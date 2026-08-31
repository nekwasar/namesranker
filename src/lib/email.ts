import { config } from "@/lib/config";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags?: string[];
}

/**
 * Transactional email via Brevo API.
 * All emails flow through here (magic links, alerts, nudges, expiry).
 * See spec §3.11.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  tags = [],
}: SendEmailParams): Promise<void> {
  const apiKey = config.brevo.apiKey;
  if (!apiKey) {
    // Dev/test fallback: log instead of failing so local flows still work.
    console.info(`[brevo:dev] To=${to} Subject="${subject}" Tags=${tags.join(",")}`);
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: config.brevo.senderEmail,
        name: config.brevo.senderName,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
      tags,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo send failed (${response.status}): ${body}`);
  }
}

export function magicLinkEmail(to: string, url: string) {
  return {
    to,
    subject: "Your NamesRanker sign-in link",
    tags: ["magic-link"],
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2>Sign in to NamesRanker</h2>
        <p>Click the button below to sign in. This link expires in 15 minutes and can only be used once.</p>
        <p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Sign in</a></p>
        <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    text: `Sign in to NamesRanker: ${url}\n\nThis link expires in 15 minutes and can only be used once.`,
  };
}

export function onboardingNudgeEmail(to: string, name: string, slug: string) {
  const url = `https://${config.baseDomain}/onboarding`;
  return {
    to,
    subject: `Finish your page — ${slug} is waiting`,
    tags: ["onboarding-nudge"],
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2>You claimed <strong>/${slug}</strong> — now finish it.</h2>
        <p>Hi ${name}, your name is searchable, but an empty page ranks for nothing. Add your bio, work, and links and we'll start ranking you for your name.</p>
        <p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Finish my page</a></p>
        <p style="color:#666;font-size:13px;">Someone else could claim a better variant of your name. Don't wait.</p>
      </div>
    `,
    text: `Hi ${name}, you claimed /${slug} — now finish it. Add your bio, work, and links and we'll start ranking you for your name. Finish here: ${url}`,
  };
}

export function claimConfirmationEmail(to: string, slug: string, url: string) {
  return {
    to,
    subject: `You claimed ${slug} on NamesRanker`,
    tags: ["claim-confirmation"],
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2>🎉 ${slug} is yours.</h2>
        <p>You've claimed <strong>/${slug}</strong> — your name is now searchable. Your page will live at:</p>
        <p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">${url}</a></p>
        <p style="color:#666;font-size:13px;">Finish your page and we'll start ranking it for your name. One-word claims stay exclusive while you're subscribed.</p>
      </div>
    `,
    text: `${slug} is yours! You've claimed /${slug}. Your page will live at ${url}. Finish your page and we'll start ranking it for your name.`,
  };
}

export function monitoringAlertEmail(to: string, watchedName: string, slugs: string[]) {
  const url = `https://${config.baseDomain}/settings`;
  const slugList = slugs.map((s) => `/${s}`).join(", ");
  return {
    to,
    subject: `⚠️ Someone claimed a name you're watching: ${watchedName}`,
    tags: ["monitoring-alert"],
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2>A slug matching “${watchedName}” was claimed</h2>
        <p>${slugList} ${slugs.length > 1 ? "were" : "was"} just claimed on NamesRanker.</p>
        <p>If this is you, great — otherwise you may want to secure the best variant before someone else does.</p>
        <p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Manage your monitoring</a></p>
      </div>
    `,
    text: `A slug matching "${watchedName}" was claimed: ${slugList}. Manage your monitoring at ${url}.`,
  };
}
