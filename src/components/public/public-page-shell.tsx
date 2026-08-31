import Link from "next/link";
import { getPublicPage, pageUrl, pageUrlForHost, PublicBlockPayload } from "@/lib/public-page";
import { ContentBlockRenderer } from "@/components/public/blocks";
import styles from "../../app/[...path]/public-page.module.css";

/**
 * Shared public-page renderer. Used by both the canonical route (`/[...path]`)
 * and the custom-domain route (`/cdom/[host]/[[...rest]]`). When `host` is
 * given (a verified custom domain), canonical/OG/JSON-LD URLs and the visible
 * path line use that host; otherwise they fall back to the base domain.
 */

interface JsonLd {
  "@context": string;
  "@type": string;
  name?: string;
  url?: string;
  description?: string;
  mainEntity?: {
    "@type": string;
    name?: string;
    jobTitle?: string | null;
    description?: string;
    image?: string;
    sameAs?: string[];
  };
  breadcrumb?: {
    "@type": string;
    itemListElement: { "@type": string; position: number; name: string; item: string }[];
  };
}

export function buildPublicJsonLd(
  data: Awaited<ReturnType<typeof getPublicPage>>,
  host?: string | null
): JsonLd {
  const url = host ? pageUrlForHost(data.page.path, host) : pageUrl(data.page.path);
  const socials = (
    data.blocks.find((b) => b.type === "SOCIAL")?.payload as PublicBlockPayload | undefined
  )?.links?.map((l) => l.url);
  const photoUrl = data.blocks.find((b) => b.type === "PHOTO")?.payload.url;

  if (data.page.isHub) {
    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: data.page.title,
      url,
      mainEntity: {
        "@type": "Person",
        name: data.page.title,
        jobTitle: data.page.descriptor,
        description: data.page.metaDescription ?? undefined,
        image: photoUrl,
        sameAs: socials,
      },
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.page.title,
    url,
    description: data.page.metaDescription ?? undefined,
    breadcrumb: data.hub
      ? {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: data.hub.title,
              item: host ? pageUrlForHost(data.hub.path, host) : pageUrl(data.hub.path),
            },
            { "@type": "ListItem", position: 2, name: data.page.title, item: url },
          ],
        }
      : undefined,
  };
}

function groupBlocks(blocks: { type: string; payload: PublicBlockPayload }[]) {
  const out: Record<string, { id: string; type: string; payload: PublicBlockPayload }[]> = {};
  blocks.forEach((b, i) => {
    const id = `${b.type}-${i}`;
    const key = b.type.toLowerCase();
    (out[key] ??= []).push({ ...b, id });
  });
  return out;
}

export function PublicPageShell({
  data,
  host,
}: {
  data: Awaited<ReturnType<typeof getPublicPage>>;
  host?: string | null;
}) {
  const groups = groupBlocks(data.blocks);
  const displayHost = host ?? "namesranker.com";

  // On a custom domain the hub lives at the root, so internal links drop the
  // hub segment (e.g. /john-smith/portfolio → /portfolio; hub → /).
  const hubPath = data.page.isHub ? data.page.path : (data.hub?.path ?? null);
  const linkTo = (path: string) => {
    if (!host) return `/${path}`;
    if (path === data.page.path || (hubPath && path === hubPath)) return "/";
    if (hubPath && path.startsWith(`${hubPath}/`)) {
      return `/${path.slice(hubPath.length + 1)}`;
    }
    return `/${path}`;
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildPublicJsonLd(data, host)) }}
      />
      <header className={styles.header}>
        {data.page.isHub ? (
          <div className={styles.avatar}>
            {groups.photo?.[0] ? (
              <ContentBlockRenderer type="PHOTO" payload={groups.photo[0].payload} />
            ) : null}
          </div>
        ) : null}
        <h1>{data.page.title}</h1>
        {data.page.descriptor ? <p className={styles.descriptor}>{data.page.descriptor}</p> : null}
        <p className={styles.path}>
          {displayHost}/{data.page.path}
        </p>
      </header>

      <div className={styles.body}>
        {groups.bio?.map((b) => (
          <ContentBlockRenderer key={b.id} type="BIO" payload={b.payload} />
        ))}
      </div>

      {data.page.isHub ? (
        <nav className={styles.subNav}>
          <h2>More from this page</h2>
          <ul>
            {data.subPages.map((sub) => (
              <li key={sub.path}>
                <Link href={linkTo(sub.path)}>{sub.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {groups.experience?.length ? (
        <section className={styles.section}>
          <h2>Experience</h2>
          {groups.experience.map((b) => (
            <ContentBlockRenderer key={b.id} type="EXPERIENCE" payload={b.payload} />
          ))}
        </section>
      ) : null}

      {groups.project?.length ? (
        <section className={styles.section}>
          <h2>Projects & work</h2>
          {groups.project.map((b) => (
            <ContentBlockRenderer key={b.id} type="PROJECT" payload={b.payload} />
          ))}
        </section>
      ) : null}

      {groups.publication?.length ? (
        <section className={styles.section}>
          <h2>Publications</h2>
          {groups.publication.map((b) => (
            <ContentBlockRenderer key={b.id} type="PUBLICATION" payload={b.payload} />
          ))}
        </section>
      ) : null}

      {groups.testimonial?.length ? (
        <section className={styles.section}>
          <h2>What people say</h2>
          {groups.testimonial.map((b) => (
            <ContentBlockRenderer key={b.id} type="TESTIMONIAL" payload={b.payload} />
          ))}
        </section>
      ) : null}

      {groups.social ? (
        <section className={styles.section}>
          <ContentBlockRenderer type="SOCIAL" payload={groups.social[0].payload} />
        </section>
      ) : null}

      {data.hub ? (
        <p className={styles.backLink}>
          <Link href={linkTo(data.hub.path)}>← {data.hub.title}</Link>
        </p>
      ) : null}
    </main>
  );
}
