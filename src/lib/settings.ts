import { prisma } from "@/lib/db";
import { revalidatePublicPages } from "@/lib/revalidate";
import { ClaimError } from "@/lib/claims/claim";
import { getOwnerPage, getOwnerPages, blockOfType, listOfType, replaceBlocks } from "@/lib/blocks";
import { computeSeoScore, countContentSignals } from "@/lib/seo";
import { isValidCustomSlug } from "@/lib/claims/slug";
import { titleFromSlug } from "@/lib/onboarding";
import type {
  ConnectorType,
  ExperienceItem,
  ProjectItem,
  PublicationItem,
  SocialLink,
  TestimonialItem,
} from "@/lib/onboarding";
import type { ClaimStatus, Prisma } from "@/generated/prisma/client";

/**
 * Settings & user-data (M6, spec §5.3, milestones §3.7):
 * full ContentBlock CRUD + reorder per page, SEO editor with SERP preview +
 * seoScore, premium-gated sub-page manager, connector management, and
 * GDPR export/delete. Every content/SEO change revalidates the public page
 * (done-when: "edit round-trips to public page via ISR revalidation").
 */

const ACTIVE_STATUSES: ClaimStatus[] = ["CLAIMED", "PROTECTED", "PENDING_RELEASE"];

export interface SettingsPageData {
  id: string;
  path: string;
  isHub: boolean;
  title: string;
  descriptor: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  seoScore: number;
  customDomain: string | null;
  customDomainToken: string | null;
  customDomainVerified: boolean;
  content: {
    photoUrl: string | null;
    bio: string | null;
    socials: SocialLink[];
    experience: ExperienceItem[];
    projects: ProjectItem[];
    publications: PublicationItem[];
    testimonials: TestimonialItem[];
  };
  connectors: { id: string; type: ConnectorType; externalUrl: string; lastSyncedAt: Date | null }[];
}

export interface SettingsData {
  claim: { slug: string; type: string } | null;
  name: string;
  pages: SettingsPageData[];
}

function toSettingsPage(
  page: NonNullable<Awaited<ReturnType<typeof getOwnerPage>>>
): SettingsPageData {
  const photo = blockOfType(page, "PHOTO") as { url?: string } | undefined;
  const bio = blockOfType(page, "BIO") as { text?: string } | undefined;
  const social = blockOfType(page, "SOCIAL") as { links?: SocialLink[] } | undefined;

  const content = {
    photoUrl: photo?.url ?? null,
    bio: bio?.text ?? null,
    socials: social?.links ?? [],
    experience: listOfType(page, "EXPERIENCE") as unknown as ExperienceItem[],
    projects: listOfType(page, "PROJECT") as unknown as ProjectItem[],
    publications: listOfType(page, "PUBLICATION") as unknown as PublicationItem[],
    testimonials: listOfType(page, "TESTIMONIAL") as unknown as TestimonialItem[],
  };

  const seoScore = computeSeoScore({
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    descriptor: page.descriptor,
    contentSignals: countContentSignals({ descriptor: page.descriptor, ...content }),
  });

  return {
    id: page.id,
    path: page.path,
    isHub: page.isHub,
    title: page.title,
    descriptor: page.descriptor,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    seoScore,
    customDomain: page.customDomain,
    customDomainToken: page.customDomainToken,
    customDomainVerified: page.customDomainVerifiedAt !== null,
    content,
    connectors: page.connectors.map((c) => ({
      id: c.id,
      type: c.type as ConnectorType,
      externalUrl: c.externalUrl,
      lastSyncedAt: c.lastSyncedAt,
    })),
  };
}

export async function getSettingsData(userId: string): Promise<SettingsData> {
  const [claim, pages] = await Promise.all([
    prisma.nameClaim.findFirst({
      where: { claimedById: userId, status: { in: ACTIVE_STATUSES } },
      orderBy: { claimedAt: "desc" },
      select: { slug: true, type: true },
    }),
    getOwnerPages(userId),
  ]);

  return {
    claim: claim ? { slug: claim.slug, type: claim.type } : null,
    name: claim ? titleFromSlug(claim.slug) : "",
    pages: pages.map(toSettingsPage),
  };
}

async function requireOwnedPage(userId: string, pageId: string) {
  const page = await getOwnerPage(userId, pageId);
  if (!page) throw new ClaimError("not_found");
  return page;
}

async function refreshSeoScore(userId: string, pageId: string): Promise<number> {
  const page = await requireOwnedPage(userId, pageId);
  const score = computeSeoScore({
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    descriptor: page.descriptor,
    contentSignals: countContentSignals({
      descriptor: page.descriptor,
      bio: (blockOfType(page, "BIO") as { text?: string } | undefined)?.text,
      socials: (blockOfType(page, "SOCIAL") as { links?: SocialLink[] } | undefined)?.links,
      experience: listOfType(page, "EXPERIENCE"),
      projects: listOfType(page, "PROJECT"),
      publications: listOfType(page, "PUBLICATION"),
      testimonials: listOfType(page, "TESTIMONIAL"),
    }),
  });
  await prisma.page.update({ where: { id: pageId }, data: { seoScore: score } });
  return score;
}

export type ContentSection =
  "profile" | "socials" | "experience" | "projects" | "publications" | "testimonials";

/** Save one content section for a page and revalidate the public route. */
export async function saveContent(
  userId: string,
  pageId: string,
  section: ContentSection,
  data: Record<string, unknown>
): Promise<{ seoScore: number }> {
  const page = await requireOwnedPage(userId, pageId);

  switch (section) {
    case "profile": {
      const descriptor = (data.descriptor as string | null) ?? null;
      const photoUrl = (data.photoUrl as string | null) ?? null;
      const bio = (data.bio as string | null) ?? null;
      await prisma.page.update({ where: { id: page.id }, data: { descriptor } });
      await replaceBlocks(
        page.id,
        ["PHOTO", "BIO"],
        [
          ...(photoUrl
            ? [{ type: "PHOTO" as const, payload: { url: photoUrl } as Prisma.InputJsonValue }]
            : []),
          ...(bio
            ? [{ type: "BIO" as const, payload: { text: bio } as Prisma.InputJsonValue }]
            : []),
        ]
      );
      break;
    }
    case "socials": {
      const links = ((data.links as SocialLink[]) ?? []).filter((l) => l.platform && l.url);
      await replaceBlocks(
        page.id,
        ["SOCIAL"],
        [
          ...(links.length
            ? [{ type: "SOCIAL" as const, payload: { links } as unknown as Prisma.InputJsonValue }]
            : []),
        ]
      );
      break;
    }
    case "experience": {
      const experience = ((data.experience as ExperienceItem[]) ?? []).filter((e) => e.role);
      await replaceBlocks(
        page.id,
        ["EXPERIENCE"],
        [
          ...experience.map((e) => ({
            type: "EXPERIENCE" as const,
            payload: e as unknown as Prisma.InputJsonValue,
          })),
        ]
      );
      break;
    }
    case "projects": {
      const projects = ((data.projects as ProjectItem[]) ?? []).filter((p) => p.title);
      await replaceBlocks(
        page.id,
        ["PROJECT"],
        [
          ...projects.map((p) => ({
            type: "PROJECT" as const,
            payload: p as unknown as Prisma.InputJsonValue,
          })),
        ]
      );
      break;
    }
    case "publications": {
      const publications = ((data.publications as PublicationItem[]) ?? []).filter((p) => p.title);
      await replaceBlocks(
        page.id,
        ["PUBLICATION"],
        [
          ...publications.map((p) => ({
            type: "PUBLICATION" as const,
            payload: p as unknown as Prisma.InputJsonValue,
          })),
        ]
      );
      break;
    }
    case "testimonials": {
      const testimonials = ((data.testimonials as TestimonialItem[]) ?? []).filter((t) => t.quote);
      await replaceBlocks(
        page.id,
        ["TESTIMONIAL"],
        [
          ...testimonials.map((t) => ({
            type: "TESTIMONIAL" as const,
            payload: t as unknown as Prisma.InputJsonValue,
          })),
        ]
      );
      break;
    }
  }

  const seoScore = await refreshSeoScore(userId, page.id);
  revalidatePublicPages(page.path);
  return { seoScore };
}

/** SEO editor: meta title/description + recomputed score (spec §5.3). */
export async function saveSeo(
  userId: string,
  pageId: string,
  meta: { metaTitle?: string | null; metaDescription?: string | null }
): Promise<{ seoScore: number }> {
  const page = await requireOwnedPage(userId, pageId);
  await prisma.page.update({
    where: { id: page.id },
    data: {
      metaTitle: meta.metaTitle?.trim() ? meta.metaTitle.trim() : null,
      metaDescription: meta.metaDescription?.trim() ? meta.metaDescription.trim() : null,
    },
  });
  const seoScore = await refreshSeoScore(userId, page.id);
  revalidatePublicPages(page.path);
  return { seoScore };
}

export interface SubPageInput {
  title: string;
  segment: string;
  descriptor?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/** Create a sub-page under the claimed slug namespace (premium, spec §5.3). */
export async function createSubPage(
  userId: string,
  input: SubPageInput
): Promise<SettingsPageData> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (user?.plan !== "PREMIUM") throw new ClaimError("premium_required");

  const claim = await prisma.nameClaim.findFirst({
    where: { claimedById: userId, status: { in: ACTIVE_STATUSES } },
    select: { slug: true },
  });
  if (!claim) throw new ClaimError("not_found");

  const segment = input.segment.trim().toLowerCase();
  if (!isValidCustomSlug(segment)) throw new ClaimError("invalid_slug");

  const path = `${claim.slug}/${segment}`;
  const existing = await prisma.page.findUnique({ where: { path }, select: { id: true } });
  if (existing) throw new ClaimError("path_taken");

  const page = await prisma.page.create({
    data: {
      ownerId: userId,
      isHub: false,
      path,
      title: input.title.trim(),
      descriptor: input.descriptor?.trim() || null,
      metaTitle: input.metaTitle?.trim() || null,
      metaDescription: input.metaDescription?.trim() || null,
      status: "LIVE",
      publishedAt: new Date(),
    },
  });

  await refreshSeoScore(userId, page.id);
  revalidatePublicPages(claim.slug);
  const fresh = await getOwnerPage(userId, page.id);
  if (!fresh) throw new ClaimError("not_found");
  return toSettingsPage(fresh);
}

export async function updateSubPage(
  userId: string,
  pageId: string,
  input: Partial<SubPageInput>
): Promise<SettingsPageData> {
  const page = await requireOwnedPage(userId, pageId);
  if (page.isHub) throw new ClaimError("invalid_slug");

  await prisma.page.update({
    where: { id: page.id },
    data: {
      title: input.title?.trim() || page.title,
      descriptor:
        input.descriptor !== undefined ? input.descriptor?.trim() || null : page.descriptor,
      metaTitle: input.metaTitle !== undefined ? input.metaTitle?.trim() || null : page.metaTitle,
      metaDescription:
        input.metaDescription !== undefined
          ? input.metaDescription?.trim() || null
          : page.metaDescription,
    },
  });

  await refreshSeoScore(userId, page.id);
  revalidatePublicPages(page.path);
  const fresh = await getOwnerPage(userId, page.id);
  if (!fresh) throw new ClaimError("not_found");
  return toSettingsPage(fresh);
}

export async function deleteSubPage(userId: string, pageId: string): Promise<void> {
  const page = await requireOwnedPage(userId, pageId);
  if (page.isHub) throw new ClaimError("invalid_slug");

  const hubPath = page.path.split("/")[0];
  await prisma.page.delete({ where: { id: page.id } }); // cascades blocks + connectors
  revalidatePublicPages(hubPath);
}

export async function addConnector(
  userId: string,
  pageId: string,
  input: { type: ConnectorType; externalUrl: string }
): Promise<{ id: string; type: ConnectorType; externalUrl: string }> {
  const page = await requireOwnedPage(userId, pageId);

  const count = await prisma.importConnector.count({ where: { pageId: page.id } });
  if (count >= 3) throw new ClaimError("connector_limit");

  const connector = await prisma.importConnector.create({
    data: { pageId: page.id, type: input.type, externalUrl: input.externalUrl },
    select: { id: true, type: true, externalUrl: true },
  });
  return {
    id: connector.id,
    type: connector.type as ConnectorType,
    externalUrl: connector.externalUrl,
  };
}

export async function removeConnector(userId: string, connectorId: string): Promise<void> {
  const connector = await prisma.importConnector.findFirst({
    where: { id: connectorId, page: { ownerId: userId } },
    select: { id: true },
  });
  if (!connector) throw new ClaimError("not_found");
  await prisma.importConnector.delete({ where: { id: connectorId } });
}

/** GDPR export: full JSON snapshot of the account (spec §5.3). */
export async function exportUserData(userId: string): Promise<unknown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      claims: true,
      pages: { include: { blocks: true, connectors: true, showcase: true } },
      monitoring: true,
    },
  });
  if (!user) throw new ClaimError("not_found");
  return { exportedAt: new Date().toISOString(), user };
}

/** GDPR delete: removes the account; relations cascade (spec §5.3 done-when). */
export async function deleteAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new ClaimError("not_found");

  // SearchConsoleLink has no FK relation to Page — clean orphans explicitly.
  const pageIds = await prisma.page.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  await prisma.searchConsoleLink.deleteMany({
    where: { pageId: { in: pageIds.map((p) => p.id) } },
  });
  await prisma.magicLinkToken.deleteMany({ where: { email: user.email } });
  await prisma.user.delete({ where: { id: userId } });
}
