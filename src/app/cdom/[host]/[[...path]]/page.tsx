import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPage, pageUrlForHost } from "@/lib/public-page";
import { resolvePageByHost } from "@/lib/custom-domain";
import { PublicPageShell } from "@/components/public/public-page-shell";

export const dynamic = "force-dynamic";

/**
 * Serves a verified custom domain. Middleware rewrites requests whose Host
 * header isn't the base domain to `/cdom/{host}/{path}`; this route resolves
 * the host → page and renders with host-relative canonical URLs (spec §3.5).
 * Unverified/unknown hosts fall through to a 404.
 */

export async function generateMetadata({
  params,
}: {
  params: { host: string; path?: string[] };
}): Promise<Metadata> {
  const resolved = await resolvePageByHost(params.host);
  if (!resolved) return { title: "Not found" };

  // Path under the custom domain is relative to the hub page.
  const segment = params.path?.join("/") ?? "";
  const fullPath = segment ? `${resolved.path}/${segment}` : resolved.path;

  const data = await getPublicPage(fullPath);
  const metaTitle = data.page.metaTitle ?? data.page.title;
  const metaDescription = data.page.metaDescription ?? `View ${data.page.title}.`;
  const canonical = pageUrlForHost(fullPath, resolved.host);

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

export default async function CustomDomainPage({
  params,
}: {
  params: { host: string; path?: string[] };
}) {
  const resolved = await resolvePageByHost(params.host);
  if (!resolved) notFound();

  const segment = params.path?.join("/") ?? "";
  const fullPath = segment ? `${resolved.path}/${segment}` : resolved.path;

  const data = await getPublicPage(fullPath);

  // JSON-LD canonical must match the request host.
  return <PublicPageShell data={data} host={resolved.host} />;
}
