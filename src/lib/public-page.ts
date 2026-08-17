import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

/**
 * Public page data layer (M3).
 * Resolves a live page by path, plus its hub and sub-pages for
 * hub-and-spoke internal linking (spec §3.5).
 */

export interface PublicBlockPayload {
  url?: string;
  text?: string;
  links?: { platform: string; url: string }[];
  role?: string;
  company?: string;
  location?: string;
  start?: string;
  end?: string;
  summary?: string;
  title?: string;
  description?: string;
  quote?: string;
  author?: string;
  publisher?: string;
}

export interface PublicPageData {
  page: {
    id: string;
    path: string;
    title: string;
    metaTitle: string | null;
    metaDescription: string | null;
    descriptor: string | null;
    isHub: boolean;
    publishedAt: Date | null;
    updatedAt: Date;
  };
  blocks: { type: string; payload: PublicBlockPayload }[];
  hub: { path: string; title: string } | null;
  subPages: { path: string; title: string }[];
}

export async function getPublicPage(path: string): Promise<PublicPageData> {
  const page = await prisma.page.findFirst({
    where: { path, status: "LIVE" },
    include: {
      blocks: { orderBy: { order: "asc" } },
    },
  });

  if (!page) {
    notFound();
  }

  const hubPath = page.isHub ? page.path : page.path.split("/")[0];

  const [hub, subPages] = await Promise.all([
    page.isHub
      ? null
      : prisma.page.findFirst({
          where: { path: hubPath, status: "LIVE" },
          select: { path: true, title: true },
        }),
    prisma.page.findMany({
      where: {
        path: { startsWith: `${hubPath}/` },
        status: "LIVE",
      },
      select: { path: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    page: {
      id: page.id,
      path: page.path,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      descriptor: page.descriptor,
      isHub: page.isHub,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
    },
    blocks: page.blocks.map((b) => ({
      type: b.type,
      payload: b.payload as PublicBlockPayload,
    })),
    hub,
    subPages,
  };
}

export function pageUrl(path: string): string {
  return `https://${config.baseDomain}/${path}`;
}

export function pageUrlPath(path: string): string {
  return `/${path}`;
}
