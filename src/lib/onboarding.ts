import { prisma } from "@/lib/db";
import { revalidatePublicPages } from "@/lib/revalidate";
import { config } from "@/lib/config";
import { getHubPage, blockOfType, listOfType, replaceBlocks } from "@/lib/blocks";
import type { ClaimStatus, Prisma } from "@/generated/prisma/client";

/**
 * Onboarding wizard data layer (M5, spec §5.2, milestones §3.3).
 *
 * 7 steps, resumable (User.onboardingStep), skip-anywhere. Every step writes
 * `ContentBlock`s (or ImportConnector rows) against the user's hub `Page`, which
 * is created lazily on the first save. Completing the wizard publishes the hub
 * page (LIVE) and sets User.onboardedAt so returning users go to /settings.
 */

export const ONBOARDING_STEPS = 7;

/** Claims that still own their slug. */
const ACTIVE_STATUSES: ClaimStatus[] = ["CLAIMED", "PROTECTED", "PENDING_RELEASE"];

export interface OnboardingState {
  step: number;
  completed: boolean;
  claim: { slug: string; type: string } | null;
  name: string;
}

/** "alex-morgan" → "Alex Morgan"; "beyonce" → "Beyonce". */
export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export interface ExperienceItem {
  role: string;
  company: string;
  location?: string | null;
  start?: string | null;
  end?: string | null;
  summary?: string | null;
}

export interface ProjectItem {
  title: string;
  description?: string | null;
  url?: string | null;
}

export interface PublicationItem {
  title: string;
  url?: string | null;
  publisher?: string | null;
}

export interface TestimonialItem {
  quote: string;
  author?: string | null;
  role?: string | null;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export type ConnectorType = "RSS" | "GITHUB" | "YOUTUBE";

export interface ConnectorItem {
  type: ConnectorType;
  externalUrl: string;
}

/** Everything the wizard + live preview needs, aggregated from saved blocks. */
export interface PreviewData {
  name: string;
  path: string;
  descriptor: string | null;
  photoUrl: string | null;
  bio: string | null;
  socials: SocialLink[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  publications: PublicationItem[];
  testimonials: TestimonialItem[];
  connectors: ConnectorItem[];
}

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const [user, claim] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingStep: true, onboardedAt: true },
    }),
    prisma.nameClaim.findFirst({
      where: { claimedById: userId, status: { in: ACTIVE_STATUSES } },
      orderBy: { claimedAt: "desc" },
      select: { slug: true, type: true },
    }),
  ]);

  if (!claim) {
    return { step: 1, completed: false, claim: null, name: "" };
  }

  if (user?.onboardedAt) {
    return {
      step: ONBOARDING_STEPS,
      completed: true,
      claim: { slug: claim.slug, type: claim.type },
      name: titleFromSlug(claim.slug),
    };
  }

  // Resume at the first incomplete step: onboardingStep holds the last completed one.
  const step = Math.min((user?.onboardingStep ?? 1) + 1, ONBOARDING_STEPS);
  return {
    step,
    completed: false,
    claim: { slug: claim.slug, type: claim.type },
    name: titleFromSlug(claim.slug),
  };
}

/** The user's hub page, created lazily on first save (path = claimed slug). */
async function ensureHubPage(userId: string, slug: string, name: string) {
  const existing = await prisma.page.findFirst({
    where: { ownerId: userId, isHub: true },
    select: { id: true, path: true, title: true },
  });
  if (existing) return existing;

  return prisma.page.create({
    data: {
      ownerId: userId,
      isHub: true,
      path: slug,
      title: name,
      descriptor: null,
      status: "DRAFT",
    },
    select: { id: true, path: true, title: true },
  });
}

/** Persist one step's data. Idempotent: replaces that step's blocks each save. */
export async function saveStep(
  userId: string,
  step: number,
  data: Record<string, unknown>
): Promise<void> {
  const claim = await prisma.nameClaim.findFirst({
    where: { claimedById: userId, status: { in: ACTIVE_STATUSES } },
    select: { slug: true },
  });
  if (!claim) throw new Error("no_claim");

  const name = titleFromSlug(claim.slug);
  const page = await ensureHubPage(userId, claim.slug, name);

  switch (step) {
    case 2: {
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
    case 3: {
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
    case 4: {
      const experience = ((data.experience as ExperienceItem[]) ?? []).filter((e) => e.role);
      const projects = ((data.projects as ProjectItem[]) ?? []).filter((p) => p.title);
      await replaceBlocks(
        page.id,
        ["EXPERIENCE", "PROJECT"],
        [
          ...experience.map((e) => ({
            type: "EXPERIENCE" as const,
            payload: e as unknown as Prisma.InputJsonValue,
          })),
          ...projects.map((p) => ({
            type: "PROJECT" as const,
            payload: p as unknown as Prisma.InputJsonValue,
          })),
        ]
      );
      break;
    }
    case 5: {
      const publications = ((data.publications as PublicationItem[]) ?? []).filter((p) => p.title);
      const testimonials = ((data.testimonials as TestimonialItem[]) ?? []).filter((t) => t.quote);
      await replaceBlocks(
        page.id,
        ["PUBLICATION", "TESTIMONIAL"],
        [
          ...publications.map((p) => ({
            type: "PUBLICATION" as const,
            payload: p as unknown as Prisma.InputJsonValue,
          })),
          ...testimonials.map((t) => ({
            type: "TESTIMONIAL" as const,
            payload: t as unknown as Prisma.InputJsonValue,
          })),
        ]
      );
      break;
    }
    case 6: {
      const connectors = ((data.connectors as ConnectorItem[]) ?? []).filter(
        (c) => c.type && c.externalUrl
      );
      await prisma.importConnector.deleteMany({ where: { pageId: page.id } });
      if (connectors.length > 0) {
        await prisma.importConnector.createMany({
          data: connectors.map((c) => ({
            pageId: page.id,
            type: c.type,
            externalUrl: c.externalUrl,
          })),
        });
      }
      break;
    }
    default:
      throw new Error("invalid_step");
  }

  // Advance resume pointer (never backwards).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingStep: true },
  });
  const next = Math.max(user?.onboardingStep ?? 0, step);
  if (next !== (user?.onboardingStep ?? 0)) {
    await prisma.user.update({ where: { id: userId }, data: { onboardingStep: next } });
  }
}

/** Mark a step done without saving content (skip-anywhere, spec §5.2). */
export async function skipStep(userId: string, step: number): Promise<number> {
  if (step >= ONBOARDING_STEPS) {
    // Skipping the publish step just defers completion — resume stays at step 7.
    return ONBOARDING_STEPS;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingStep: true },
  });
  const next = Math.max(user?.onboardingStep ?? 0, step);
  await prisma.user.update({ where: { id: userId }, data: { onboardingStep: next } });
  return Math.min(next + 1, ONBOARDING_STEPS);
}

/** Publish the hub page (LIVE) and mark the wizard complete. */
export async function completeOnboarding(userId: string): Promise<{ path: string; url: string }> {
  const claim = await prisma.nameClaim.findFirst({
    where: { claimedById: userId, status: { in: ACTIVE_STATUSES } },
    select: { slug: true },
  });
  if (!claim) throw new Error("no_claim");

  const name = titleFromSlug(claim.slug);
  const page = await ensureHubPage(userId, claim.slug, name);

  await prisma.page.update({
    where: { id: page.id },
    data: {
      status: "LIVE",
      publishedAt: new Date(),
      title: name,
      metaTitle: page.title !== name ? page.title : null,
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date(), onboardingStep: ONBOARDING_STEPS },
  });

  revalidatePublicPages(claim.slug);

  return { path: claim.slug, url: `https://${config.baseDomain}/${claim.slug}` };
}

/** Aggregate everything saved for the hub page (live preview + final review). */
export async function getPreviewData(userId: string): Promise<PreviewData | null> {
  const claim = await prisma.nameClaim.findFirst({
    where: { claimedById: userId, status: { in: ACTIVE_STATUSES } },
    select: { slug: true },
  });
  if (!claim) return null;

  const page = await getHubPage(userId);
  const name = titleFromSlug(claim.slug);
  if (!page) {
    return {
      name,
      path: claim.slug,
      descriptor: null,
      photoUrl: null,
      bio: null,
      socials: [],
      experience: [],
      projects: [],
      publications: [],
      testimonials: [],
      connectors: [],
    };
  }

  const photo = blockOfType(page, "PHOTO") as { url?: string } | undefined;
  const bio = blockOfType(page, "BIO") as { text?: string } | undefined;
  const social = blockOfType(page, "SOCIAL") as { links?: SocialLink[] } | undefined;

  return {
    name,
    path: claim.slug,
    descriptor: page.descriptor,
    photoUrl: photo?.url ?? null,
    bio: bio?.text ?? null,
    socials: social?.links ?? [],
    experience: listOfType(page, "EXPERIENCE") as unknown as ExperienceItem[],
    projects: listOfType(page, "PROJECT") as unknown as ProjectItem[],
    publications: listOfType(page, "PUBLICATION") as unknown as PublicationItem[],
    testimonials: listOfType(page, "TESTIMONIAL") as unknown as TestimonialItem[],
    connectors: page.connectors.map((c) => ({
      type: c.type as ConnectorType,
      externalUrl: c.externalUrl,
    })),
  };
}

/**
 * Nudge candidates (M5 deliverable: 24h nudge email): users who signed up
 * 24–48h ago, claimed a name, and haven't finished onboarding. One send window
 * keeps the nudge safe without extra tracking state (spec §2.7 / §3.11).
 */
export async function findNudgeCandidates(): Promise<
  { email: string; name: string; slug: string }[]
> {
  const now = Date.now();
  const since = new Date(now - 48 * 3600 * 1000);
  const until = new Date(now - 24 * 3600 * 1000);

  const users = await prisma.user.findMany({
    where: { onboardedAt: null, createdAt: { gte: since, lte: until } },
    select: {
      email: true,
      claims: {
        where: { status: { in: ACTIVE_STATUSES } },
        select: { slug: true },
        take: 1,
      },
    },
  });

  return users
    .filter((u) => u.claims.length > 0)
    .map((u) => ({
      email: u.email,
      name: titleFromSlug(u.claims[0].slug),
      slug: u.claims[0].slug,
    }));
}
