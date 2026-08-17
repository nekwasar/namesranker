import { revalidatePath } from "next/cache";

/**
 * Revalidates the public pages affected by a change to `pagePath`.
 * Rebuilds the page itself, its hub (for sub-pages), the sitemap, and the
 * home page (demo/scarcity sections). Spec §3.5 hub-and-spoke freshness.
 */
export async function revalidatePublicPages(pagePath: string) {
  const hubPath = pagePath.includes("/") ? pagePath.split("/")[0] : pagePath;

  const paths = new Set<string>();
  paths.add(pagePath);
  paths.add(hubPath);
  paths.add("/names");

  for (const p of Array.from(paths)) {
    revalidatePath(p, "page");
  }
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml", "page");
}
