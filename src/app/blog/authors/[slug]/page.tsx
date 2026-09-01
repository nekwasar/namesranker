import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import { blogAuthors, formatBlogDate, getBlogAuthor, postsByAuthor } from "@/lib/blog";
import styles from "./author.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return blogAuthors.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const author = getBlogAuthor(params.slug);
  if (!author) return {};
  return {
    title: `${author.name} — NamesRanker Blog`,
    description: author.bio,
  };
}

export default function AuthorPage({ params }: { params: { slug: string } }) {
  const author = getBlogAuthor(params.slug);
  if (!author) notFound();

  const posts = postsByAuthor(author);

  return (
    <main>
      <NavBar />
      <article className={styles.page}>
        <Link href="/blog/authors" className={styles.back}>
          ← All authors
        </Link>

        <header className={styles.header}>
          <div className={styles.avatarWrap}>
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatarUrl} alt="" className={styles.avatar} />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                {author.name.charAt(0)}
              </span>
            )}
          </div>
          <h1 className={styles.name}>{author.name}</h1>
          {author.role ? <p className={styles.role}>{author.role}</p> : null}
          <p className={styles.bio}>{author.bio}</p>
        </header>

        <section className={styles.posts}>
          <h2 className={styles.postsHeading}>
            {posts.length} post{posts.length === 1 ? "" : "s"}
          </h2>
          {posts.length === 0 ? (
            <p className={styles.empty}>No posts yet.</p>
          ) : (
            <ul className={styles.postList}>
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className={styles.postLink}>
                    <span className={styles.postMeta}>
                      <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                      <span>·</span>
                      <span>{post.category}</span>
                    </span>
                    <span className={styles.postTitle}>{post.title}</span>
                    <span className={styles.postExcerpt}>{post.excerpt}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
      <Footer />
    </main>
  );
}
