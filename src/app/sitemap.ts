import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { blogAuthors, blogPosts } from "@/lib/blog";
import { useCases } from "@/lib/usecases";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await prisma.page.findMany({
    where: { status: "LIVE" },
    select: {
      path: true,
      isHub: true,
      updatedAt: true,
      publishedAt: true,
      customDomain: true,
      customDomainVerifiedAt: true,
    },
  });

  const base = `https://${config.baseDomain}`;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/names`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/usecases`, changeFrequency: "monthly", priority: 0.5 },
    ...useCases.map((c) => ({
      url: `${base}/usecases/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...blogPosts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(`${post.date}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${base}/blog/authors`, changeFrequency: "monthly", priority: 0.4 },
    ...blogAuthors.map((a) => ({
      url: `${base}/blog/authors/${a.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];

  const userRoutes: MetadataRoute.Sitemap = pages.map((page) => {
    // A verified custom domain serves the page under its own host (spec §3.5).
    if (page.customDomain && page.customDomainVerifiedAt) {
      const host = page.customDomain;
      // The hub page lives at the root of the custom domain; sub-pages keep the
      // portion of the path after the hub segment.
      const segment = page.path.includes("/") ? page.path.split("/").slice(1).join("/") : "";
      return {
        url: `https://${host}/${segment}`,
        lastModified: page.updatedAt,
        changeFrequency: "weekly",
        priority: page.isHub ? 1 : 0.6,
      };
    }
    return {
      url: `${base}/${page.path}`,
      lastModified: page.updatedAt,
      changeFrequency: "weekly",
      priority: page.path.includes("/") ? 0.6 : 0.9,
    };
  });

  return [...staticRoutes, ...userRoutes];
}
