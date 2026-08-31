import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await prisma.page.findMany({
    where: { status: "LIVE" },
    select: { path: true, updatedAt: true, publishedAt: true },
  });

  const base = `https://${config.baseDomain}`;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/names`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const userRoutes: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${base}/${page.path}`,
    lastModified: page.updatedAt,
    changeFrequency: "weekly",
    priority: page.path.includes("/") ? 0.6 : 0.9,
  }));

  return [...staticRoutes, ...userRoutes];
}
