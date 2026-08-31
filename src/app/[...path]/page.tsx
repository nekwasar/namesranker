import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getPublicPage, pageUrl } from "@/lib/public-page";
import { PublicPageShell } from "@/components/public/public-page-shell";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const pages = await prisma.page.findMany({
    where: { status: "LIVE" },
    select: { path: true },
  });
  return pages.map((p) => ({ path: p.path.split("/") }));
}

export async function generateMetadata({
  params,
}: {
  params: { path: string[] };
}): Promise<Metadata> {
  const path = params.path.join("/");
  const data = await getPublicPage(path);

  const metaTitle = data.page.metaTitle ?? data.page.title;
  const metaDescription = data.page.metaDescription ?? `View ${data.page.title} on NamesRanker.`;
  const canonical = pageUrl(data.page.path);

  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonical,
      type: "profile",
      siteName: "NamesRanker",
    },
  };
}

export default async function PublicPage({ params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const data = await getPublicPage(path);
  return <PublicPageShell data={data} />;
}
