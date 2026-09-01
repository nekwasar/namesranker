import Link from "next/link";
import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import { changelogEntries, relatedPost } from "@/lib/changelog";
import { formatBlogDate } from "@/lib/blog";
import styles from "./changelog.module.css";

export const metadata = {
  title: "Changelog — NamesRanker",
  description:
    "Every NamesRanker release, improvement, and fix — from name monitoring and Search Console to custom domains and race-safe claims.",
};

export default function ChangelogPage() {
  return (
    <main>
      <NavBar />
      <div className={styles.page}>
        <h1 className={styles.title}>Changelog</h1>
        <p className={styles.subtitle}>Every release, improvement, and fix — newest first.</p>
        <hr className={styles.rule} />

        <div className={styles.list} data-testid="changelog-list">
          {changelogEntries.map((entry) => {
            const post = relatedPost(entry);
            return (
              <article key={entry.version} className={styles.entry} data-testid="changelog-entry">
                <div className={styles.meta}>
                  <span className={styles.version} data-testid="changelog-version">
                    {entry.version}
                  </span>
                  <time dateTime={entry.date} className={styles.date}>
                    {formatBlogDate(entry.date)}
                  </time>
                </div>
                <div className={styles.body}>
                  <div className={styles.headline}>
                    <span className={`${styles.tag} ${styles[entry.tag.toLowerCase()]}`}>
                      {entry.tag}
                    </span>
                    <h2 className={styles.entryTitle}>{entry.title}</h2>
                  </div>
                  <p className={styles.description}>{entry.description}</p>
                  {post ? (
                    <Link href={`/blog/${post.slug}`} className={styles.postLink}>
                      Read the announcement →
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <Footer />
    </main>
  );
}
