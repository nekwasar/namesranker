import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import { blogAuthors, blogPosts, formatBlogDate, getBlogPost } from "@/lib/blog";
import styles from "./post.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — NamesRanker Blog`,
    description: post.excerpt,
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  return (
    <main>
      <NavBar />
      <article className={styles.page}>
        <Link href="/blog" className={styles.back}>
          ← Blog
        </Link>
        <header className={styles.header}>
          <div className={styles.meta}>
            <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
            <span>·</span>
            <span>{post.category}</span>
          </div>
          <h1 className={styles.title}>{post.title}</h1>
          <p className={styles.excerpt}>{post.excerpt}</p>
          <div className={styles.byline}>
            <div className={styles.avatars}>
              {post.authors.slice(0, 3).map((author, i) =>
                author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={author.avatarUrl} alt="" className={styles.avatar} />
                ) : (
                  <span key={i} className={styles.avatarFallback} aria-hidden="true">
                    {author.name.charAt(0)}
                  </span>
                )
              )}
            </div>
            <div className={styles.authors}>
              <span className={styles.authorName}>
                {post.authors.map((author, i) => {
                  const profile = blogAuthors.find((a) => a.name === author.name);
                  const separator = i > 0 ? ", " : "";
                  return profile ? (
                    <span key={author.name}>
                      {separator}
                      <Link href={`/blog/authors/${profile.slug}`} className={styles.authorLink}>
                        {author.name}
                      </Link>
                    </span>
                  ) : (
                    <span key={author.name}>
                      {separator}
                      {author.name}
                    </span>
                  );
                })}
              </span>
              {post.authors[0]?.role ? (
                <span className={styles.authorRole}>{post.authors[0].role}</span>
              ) : null}
            </div>
          </div>
        </header>

        <div className={styles.body}>
          {post.body.map((block, i) =>
            typeof block === "string" ? (
              <p key={i}>{block}</p>
            ) : "h" in block ? (
              <h2 key={i} className={styles.subhead}>
                {block.h}
              </h2>
            ) : (
              <ul key={i} className={styles.list}>
                {block.ul.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )
          )}
          {!post.full && (
            <p className={styles.signoff}>
              Full posts are coming to the NamesRanker blog — this is a preview of the post.
            </p>
          )}
        </div>
      </article>
      <Footer />
    </main>
  );
}
