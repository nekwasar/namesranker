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
