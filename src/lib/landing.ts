import { prisma } from "@/lib/db";

/**
 * Landing page data (M2).
 * - Scarcity strip: sample slugs with live availability status.
 * - Demo profiles: the exactly-two seeded demo pages.
 */

export type ScarcityEntry = {
  name: string;
  slug: string;
  status: "available" | "taken" | "premium";
};

const scarcitySamples: { name: string; slug: string; words: number }[] = [
  { name: "Emily Chen", slug: "emily-chen", words: 2 },
  { name: "Michael Brown", slug: "michael-brown", words: 2 },
  { name: "Sarah Jones", slug: "sarah-jones", words: 2 },
  { name: "James Wilson", slug: "james-wilson", words: 2 },
  { name: "Priya Patel", slug: "priya-patel", words: 2 },
  { name: "Beyoncé", slug: "beyonce", words: 1 },
];

export async function getScarcity(): Promise<ScarcityEntry[]> {
  const claimed = await prisma.nameClaim.findMany({
    where: { slug: { in: scarcitySamples.map((s) => s.slug) } },
    select: { slug: true },
  });
  const claimedSet = new Set(claimed.map((c) => c.slug));

  return scarcitySamples.map((sample) => ({
    name: sample.name,
    slug: sample.slug,
    status: claimedSet.has(sample.slug) ? "taken" : sample.words === 1 ? "premium" : "available",
  }));
}

export async function getDemoProfiles() {
  const pages = await prisma.page.findMany({
    where: { status: "LIVE", isHub: true },
    include: {
      blocks: {
        orderBy: { order: "asc" },
        select: { type: true, payload: true },
      },
    },
    orderBy: { publishedAt: "asc" },
    take: 2,
  });

  return pages.map((page) => {
    const block = (type: string) =>
      page.blocks.find((b) => b.type === type)?.payload as
        { text?: string; url?: string; links?: { platform: string; url: string }[] } | undefined;

    const photo = block("PHOTO") as { url?: string } | undefined;
    const bio = block("BIO") as { text?: string } | undefined;
    const socials = block("SOCIAL") as { links?: { platform: string; url: string }[] } | undefined;
    const projects = page.blocks
      .filter((b) => b.type === "PROJECT")
      .map((b) => b.payload as { title: string; description: string });

    return {
      path: page.path,
      title: page.title,
      descriptor: page.descriptor,
      photoUrl: photo?.url,
      bio: bio?.text,
      socials: socials?.links ?? [],
      projects,
    };
  });
}
