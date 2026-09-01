import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import { blogAuthors, postsByAuthor } from "@/lib/blog";
import styles from "./authors.module.css";

export const metadata: Metadata = {
  title: "Authors — NamesRanker Blog",
  description: "The people writing about names, ranking, and owning your search result.",
};

export default function AuthorsPage() {
  return (
    <main>
      <NavBar />
      <div className={styles.page}>
        <h1 className={styles.title}>Authors</h1>
        <p className={styles.subtitle}>
          The people behind the NamesRanker blog — writing about names, ranking, and owning your
          search result.
        </p>
        <hr className={styles.rule} />

        <div className={styles.grid} data-testid="authors-grid">
          {blogAuthors.map((author) => {
            const posts = postsByAuthor(author);
            return (
              <Link key={author.slug} href={`/blog/authors/${author.slug}`} className={styles.card}>
                <div className={styles.avatarWrap}>
                  {author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={author.avatarUrl} alt="" className={styles.avatar} loading="lazy" />
                  ) : (
                    <span className={styles.avatarFallback} aria-hidden="true">
                      {author.name.charAt(0)}
                    </span>
                  )}
                </div>
                <h2 className={styles.cardName}>{author.name}</h2>
                {author.role ? <p className={styles.cardRole}>{author.role}</p> : null}
                <p className={styles.cardBio}>{author.bio}</p>
                <p className={styles.cardCount}>
                  {posts.length} post{posts.length === 1 ? "" : "s"}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </main>
  );
}
