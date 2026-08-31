import Link from "next/link";
import type { Metadata } from "next";
import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import { config } from "@/lib/config";
import { parseDirectoryParams, searchDirectory, getDirectoryFacets } from "@/lib/directory";
import { pageUrl } from "@/lib/public-page";
import DirectorySearch from "./directory-search";
import styles from "./directory.module.css";

export const metadata: Metadata = {
  title: "Name directory — NamesRanker",
  description:
    "Browse the NamesRanker directory — claimed, SEO-optimized name pages. Search by name and filter by profession or location.",
  alternates: { canonical: `https://${config.baseDomain}/names` },
  openGraph: {
    title: "Name directory — NamesRanker",
    description:
      "Browse claimed name pages on NamesRanker. Search by name, filter by profession or location.",
    url: `https://${config.baseDomain}/names`,
    type: "website",
  },
};

export const revalidate = 3600;

export default async function NamesDirectory({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseDirectoryParams(searchParams);
  const [page, facets] = await Promise.all([searchDirectory(filters), getDirectoryFacets()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "NamesRanker directory",
    description: metadata.description,
    itemListElement: page.results.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.name,
      url: pageUrl(r.path),
    })),
  };

  return (
    <main>
      <NavBar />

      <section className={styles.page}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Name directory</p>
          <h1 className={styles.title}>Who owns their name</h1>
          <p className={styles.sub}>
            Every claimed page below is SEO-engineered to rank first for its owner&apos;s name.
            Search by name, then filter by profession or location to find exactly who you&apos;re
            looking for.
          </p>
        </div>

        <DirectorySearch facets={facets} filters={filters} total={page.total} />

        <div className={styles.resultHead}>
          <p className={styles.count} aria-live="polite">
            {page.total.toLocaleString()} {page.total === 1 ? "page" : `pages`}
            {page.filters.q || page.filters.profession || page.filters.location
              ? " match your search"
              : " in the directory"}
          </p>
        </div>

        {page.results.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No pages found</p>
            <p className={styles.emptyBody}>
              Try a different name, or clear the filters to see every claimed page. If your own name
              is missing, claim it — and your page will appear here.
            </p>
            <Link href="/onboarding" className={styles.emptyCta}>
              Claim your name
            </Link>
          </div>
        ) : (
          <div className={styles.grid} data-testid="directory-grid">
            {page.results.map((r) => (
              <Link key={r.path} href={`/${r.path}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.avatar} aria-hidden="true">
                    {r.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photoUrl} alt="" className={styles.avatarImg} />
                    ) : (
                      <span className={styles.avatarFallback}>{initials(r.name)}</span>
                    )}
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardName}>{r.name}</h3>
                  {r.profession ? <p className={styles.cardDesc}>{r.profession}</p> : null}
                  {r.descriptor ? <p className={styles.cardMeta}>{r.descriptor}</p> : null}
                  <span className={styles.cardPath}>namesranker.com/{r.path}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Pagination page={page} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </section>

      <Footer />
    </main>
  );
}

function Pagination({ page }: { page: Awaited<ReturnType<typeof searchDirectory>> }) {
  const { page: current, pageCount, pageSize } = page;
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (page.filters.q) params.set("q", page.filters.q);
    if (page.filters.profession) params.set("profession", page.filters.profession);
    if (page.filters.location) params.set("location", page.filters.location);
    if (page.filters.sort !== "relevant") params.set("sort", page.filters.sort);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/names?${s}` : "/names";
  };

  if (pageCount <= 1) {
    // Single page — nothing to paginate.
    return null;
  }

  const from = current * pageSize - pageSize + 1;
  const to = Math.min(current * pageSize, page.total);

  return (
    <nav
      className={styles.pagination}
      aria-label="Directory pagination"
      data-testid="directory-pagination"
    >
      <p className={styles.paginationMeta}>
        Showing {from}–{to} of {page.total}
      </p>
      <div className={styles.paginationControls}>
        {current > 1 ? (
          <Link href={qs(current - 1)} className={styles.pageBtn} rel="prev">
            ← Prev
          </Link>
        ) : (
          <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>← Prev</span>
        )}
        <span className={styles.pageNum}>
          Page {current} of {pageCount}
        </span>
        {current < pageCount ? (
          <Link href={qs(current + 1)} className={styles.pageBtn} rel="next">
            Next →
          </Link>
        ) : (
          <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>Next →</span>
        )}
      </div>
    </nav>
  );
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
