import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { revalidatePublicPages } from "@/lib/revalidate";
import { ClaimError } from "@/lib/claims/claim";

/**
 * Custom domains (spec §3.5 premium / §10.2). A premium user attaches their own
 * domain to a page; the app verifies ownership via a DNS TXT record, then serves
 * the page under that host with host-relative canonical URLs.
 *
 * - setCustomDomain: validate + store + generate the TXT token (unverified).
 * - verifyCustomDomain: DNS TXT lookup confirms the token → verified.
 * - removeCustomDomain: detach the domain.
 * - resolvePageByHost: find the live page served under a request Host header.
 */

const HOSTNAME_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*$/;

export interface CustomDomainSetResult {
  domain: string;
  token: string;
  txtName: string;
}

/** Strip scheme, port, path, and www; returns a clean lowercase hostname or null. */
export function normalizeDomain(raw: string): string | null {
  if (!raw) return null;
  let host = raw.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "");
  host = host.split("/")[0];
  host = host.split("?")[0];
  host = host.split("#")[0];
  // strip port
  host = host.replace(/:\d+$/, "");
  host = host.replace(/^www\./, "");
  if (!host) return null;
  return host;
}

/** Hostnames we never allow as a custom domain (our own domains + localhost). */
export function isReservedDomain(host: string): boolean {
  const reserved = new Set<string>([
    "localhost",
    config.baseDomain.toLowerCase(),
    config.raNkDomain.toLowerCase(),
    "ra-nk.co",
  ]);
  if (reserved.has(host)) return true;
  // any subdomain of our own domains is also off-limits
  for (const base of [
    config.baseDomain.toLowerCase(),
    config.raNkDomain.toLowerCase(),
    "ra-nk.co",
  ]) {
    if (host.endsWith(`.${base}`)) return true;
  }
  return false;
}

export function isValidHostname(host: string): boolean {
  if (!host || host.length > 253) return false;
  if (!host.includes(".")) return false; // bare single-label hosts aren't real custom domains
  return HOSTNAME_RE.test(host);
}

/** The DNS TXT record name that must carry the verification token. */
export function verificationTxtName(host: string): string {
  return `_namesranker.${host}`;
}

async function requirePremiumOwner(userId: string, pageId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (user?.plan !== "PREMIUM") return null;
  return prisma.page.findFirst({
    where: { id: pageId, ownerId: userId },
    select: { id: true, path: true },
  });
}

/**
 * Attach a custom domain to a premium user's page. Validates, rejects reserved
 * domains, generates a DNS TXT token, and stores it unverified.
 */
export async function setCustomDomain(
  userId: string,
  pageId: string,
  rawDomain: string
): Promise<CustomDomainSetResult> {
  const page = await requirePremiumOwner(userId, pageId);
  if (!page) throw new ClaimError("premium_required");

  const host = normalizeDomain(rawDomain);
  if (!host || !isValidHostname(host)) throw new ClaimError("invalid_domain");
  if (isReservedDomain(host)) throw new ClaimError("reserved_domain");

  const existing = await prisma.page.findUnique({
    where: { customDomain: host },
    select: { id: true },
  });
  if (existing) throw new ClaimError("domain_taken");

  const token = randomBytes(16).toString("hex");
  await prisma.page.update({
    where: { id: page.id },
    data: { customDomain: host, customDomainToken: token, customDomainVerifiedAt: null },
  });
  revalidatePublicPages(page.path);
  return { domain: host, token, txtName: verificationTxtName(host) };
}

/**
 * Confirms the domain by checking its DNS TXT record carries our token.
 * Throws ClaimError("verification_failed") when the record is absent/mismatched
 * so the caller can present the required TXT value.
 */
export async function verifyCustomDomain(
  userId: string,
  pageId: string
): Promise<{ verified: boolean; domain: string; token: string; txtName: string }> {
  const page = await requirePremiumOwner(userId, pageId);
  if (!page) throw new ClaimError("premium_required");

  const full = await prisma.page.findUnique({
    where: { id: page.id },
    select: { customDomain: true, customDomainToken: true },
  });
  if (!full?.customDomain || !full.customDomainToken) throw new ClaimError("invalid_domain");

  const { customDomain: host, customDomainToken: token } = full;
  const txtName = verificationTxtName(host);

  let records: string[][] = [];
  try {
    records = await resolveTxt(txtName);
  } catch {
    // DNS lookup failed (record not published / domain not resolving) — not verified.
  }

  const verified = records.some((parts) =>
    parts.some((part) => part.replace(/^"|"$/g, "").trim().includes(token))
  );

  if (!verified) throw new ClaimError("verification_failed");

  await prisma.page.update({
    where: { id: page.id },
    data: { customDomainVerifiedAt: new Date() },
  });
  revalidatePublicPages(page.path);
  return { verified: true, domain: host, token, txtName };
}

/** Detach a custom domain from a page. */
export async function removeCustomDomain(userId: string, pageId: string): Promise<void> {
  const page = await prisma.page.findFirst({
    where: { id: pageId, ownerId: userId },
    select: { id: true, path: true },
  });
  if (!page) throw new ClaimError("not_found");
  await prisma.page.update({
    where: { id: page.id },
    data: { customDomain: null, customDomainToken: null, customDomainVerifiedAt: null },
  });
  revalidatePublicPages(page.path);
}

/**
 * Resolve a live page from a request Host header. Returns the page + the
 * canonical host to use, or null when the host isn't a verified custom domain.
 */
export async function resolvePageByHost(
  hostname: string
): Promise<{ path: string; title: string; host: string } | null> {
  const host = normalizeDomain(hostname);
  if (!host) return null;

  const page = await prisma.page.findFirst({
    where: {
      customDomain: host,
      customDomainVerifiedAt: { not: null },
      status: "LIVE",
    },
    select: { path: true, title: true },
  });
  if (!page) return null;
  return { path: page.path, title: page.title, host };
}
