import { revalidatePath } from "next/cache";

/**
 * Revalidates the public pages affected by a change to `pagePath`.
 *
 * - The changed path and its hub are revalidated per-page (a no-op for
 *   dynamic user pages, but correct for any static ISR page passed in).
 * - User pages (hubs and sub-pages) are all rendered by the `[...path]`
 *   catch-all dynamic route, so the route itself is revalidated
 *   (`_N_T_/[...path]/page` tag) — per-path tags are never emitted by
 *   dynamic routes, so this is what actually refreshes them.
 * - The home page, directory, and sitemap are revalidated as pages.
 *
 * NEVER use layout-level revalidation (`revalidatePath("/", "layout")`):
 * it invalidates every page under the root layout — including statically
 * generated marketing pages (blog posts, authors, use cases). Re-rendering
 * those on demand falls through to the `[...path]` catch-all, which persists
 * a 404 over the good static output and permanently breaks the page.
 */
export async function revalidatePublicPages(pagePath: string) {
  const hubPath = pagePath.includes("/") ? pagePath.split("/")[0] : pagePath;

  const paths = new Set<string>();
  paths.add(pagePath);
  paths.add(hubPath);

  for (const p of Array.from(paths)) {
    revalidatePath(`/${p.replace(/^\/+/, "")}`, "page");
  }
  revalidatePath("/[...path]", "page");
  revalidatePath("/", "page");
  revalidatePath("/names", "page");
  revalidatePath("/sitemap.xml", "page");
}
