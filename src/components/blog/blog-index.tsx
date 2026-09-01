"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BLOG_CATEGORIES, authorLine, filterPosts, formatBlogDate } from "@/lib/blog";
import type { BlogPost } from "@/lib/blog";
import styles from "./blog-index.module.css";

function SearchIcon() {
  return (
    <svg
      className={styles.searchIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function RssIcon() {
  return (
    <svg
      className={styles.rssIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}

export default function BlogIndex({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => filterPosts(posts, category, query), [posts, category, query]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Blog</h1>

      <div className={styles.controls}>
        <nav className={styles.tabs} aria-label="Blog categories">
          {["All", ...BLOG_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.tab} ${category === c ? styles.tabActive : ""}`}
              data-testid={`blog-tab-${c.toLowerCase().replace(/\s+/g, "-")}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </nav>

        <div className={styles.controlsRight}>
          <div className={styles.search}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search posts…"
              value={query}
              data-testid="blog-search"
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search posts"
            />
            <SearchIcon />
          </div>
          <Link
            href="/blog/feed.xml"
            className={styles.rss}
            data-testid="blog-rss"
            aria-label="RSS feed"
            title="RSS feed"
          >
            <RssIcon />
          </Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty} data-testid="blog-empty">
          No posts match this filter yet.
        </p>
      ) : (
        <div className={styles.grid} data-testid="blog-grid">
          {visible.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.card}>
              <div>
                <div className={styles.cardHeader}>
                  <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                  <span>·</span>
                  <span>{post.category}</span>
                </div>
                <h2 className={styles.cardTitle}>{post.title}</h2>
                <p className={styles.cardExcerpt}>{post.excerpt}</p>
              </div>
              <div className={styles.cardFooter}>
                <div className={styles.avatars}>
                  {post.authors.slice(0, 3).map((author, i) =>
                    author.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={author.avatarUrl}
                        alt=""
                        className={styles.avatar}
                        loading="lazy"
                      />
                    ) : (
                      <span key={i} className={styles.avatarFallback} aria-hidden="true">
                        {author.name.charAt(0)}
                      </span>
                    )
                  )}
                </div>
                <span className={styles.authorLine}>{authorLine(post.authors)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
