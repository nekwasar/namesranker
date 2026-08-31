import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

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
