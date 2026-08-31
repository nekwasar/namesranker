import { prisma } from "@/lib/db";
import { encryptOauthToken } from "@/lib/gsc/crypto";
import { ClaimError } from "@/lib/claims/claim";
import {
  fetchSearchAnalytics,
  refreshAccessToken,
  SearchAnalyticsResult,
  decryptToken,
} from "@/lib/gsc/google";

/**
 * Search Console link + analytics service (M11, spec §6 / §10.2).
 *
 * - `SearchConsoleLink` is per page (one per premium page) and stores the OAuth
 *   refresh token encrypted at rest.
 * - Premium-only ("deep SEO" gate, spec §10.2). Ownership via the owning page.
 */

const PREMIUM_ERROR = new ClaimError("premium_required");

async function requirePremiumPage(userId: string, pageId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (user?.plan !== "PREMIUM") throw PREMIUM_ERROR;

  const page = await prisma.page.findFirst({
    where: { id: pageId, ownerId: userId },
    select: { id: true, path: true },
  });
  if (!page) throw new ClaimError("not_found");
  return page;
}

export interface GscLinkDto {
  id: string;
  pageId: string;
  pagePath: string;
  pageTitle: string;
  propertyUrl: string;
  lastImportAt: string | null;
}

/** List every Search Console link belonging to the user's pages. */
export async function getLinks(userId: string): Promise<GscLinkDto[]> {
  const links = await prisma.searchConsoleLink.findMany({
    where: {},
    include: { page: { select: { path: true, title: true } } },
  });
  const pages = await prisma.page.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  const owned = new Set(pages.map((p) => p.id));
  return links
    .filter((l) => owned.has(l.pageId))
    .map((l) => ({
      id: l.id,
      pageId: l.pageId,
      pagePath: l.page.path,
      pageTitle: l.page.title,
      propertyUrl: l.propertyUrl,
      lastImportAt: l.lastImportAt ? l.lastImportAt.toISOString() : null,
    }));
}

/** Record a finished OAuth exchange: store the (encrypted) refresh token. */
export async function saveLink(params: {
  userId: string;
  pageId: string;
  propertyUrl: string;
  refreshToken: string;
}): Promise<void> {
  await requirePremiumPage(params.userId, params.pageId);
  const encrypted = encryptOauthToken(params.refreshToken);
  await prisma.searchConsoleLink.upsert({
    where: { pageId: params.pageId },
    create: {
      pageId: params.pageId,
      propertyUrl: params.propertyUrl,
      oauthRefreshToken: encrypted,
    },
    update: { propertyUrl: params.propertyUrl, oauthRefreshToken: encrypted, lastImportAt: null },
  });
}

/** Disconnect a Search Console link owned by the user. */
export async function deleteLink(userId: string, linkId: string): Promise<void> {
  const link = await prisma.searchConsoleLink.findFirst({
    where: { id: linkId, page: { ownerId: userId } },
    select: { id: true },
  });
  if (!link) throw new ClaimError("not_found");
  await prisma.searchConsoleLink.delete({ where: { id: link.id } });
}

/** Pulls Search Analytics for a link, refreshing tokens as needed. */
export async function refreshAnalytics(
  userId: string,
  linkId: string
): Promise<SearchAnalyticsResult> {
  const link = await prisma.searchConsoleLink.findFirst({
    where: { id: linkId, page: { ownerId: userId } },
    select: { id: true, pageId: true, propertyUrl: true, oauthRefreshToken: true },
  });
  if (!link) throw new ClaimError("not_found");

  const refreshToken = decryptToken(link.oauthRefreshToken);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  const accessToken = await refreshAccessToken(refreshToken);
  const result = await fetchSearchAnalytics({
    siteUrl: link.propertyUrl,
    accessToken,
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    rowLimit: 25,
  });

  await prisma.searchConsoleLink.update({
    where: { id: link.id },
    data: { lastImportAt: new Date() },
  });
  return result;
}
