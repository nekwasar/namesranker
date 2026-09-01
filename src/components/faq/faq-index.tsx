"use client";

import { useMemo, useState } from "react";
import { FAQ_CATEGORIES, filterFaq } from "@/lib/faq";
import type { FaqItem } from "@/lib/faq";
import styles from "./faq-index.module.css";

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

function Chevron() {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function FaqIndex({ items }: { items: FaqItem[] }) {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => filterFaq(items, category, query), [items, category, query]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>FAQ</h1>
      <p className={styles.subtitle}>
        Everything about claiming your name, ranking on Google, and Premium.
      </p>

      <div className={styles.controls}>
        <nav className={styles.tabs} aria-label="FAQ categories">
          {["All", ...FAQ_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.tab} ${category === c ? styles.tabActive : ""}`}
              data-testid={`faq-tab-${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </nav>

        <div className={styles.search}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search questions…"
            value={query}
            data-testid="faq-search"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search questions"
          />
          <SearchIcon />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty} data-testid="faq-empty">
          No questions match this filter. Try a different search.
        </p>
      ) : (
        <div className={styles.list} data-testid="faq-list">
          {visible.map((item, i) => (
            <details key={`${item.category}-${i}`} className={styles.item} data-testid="faq-item">
              <summary className={styles.question} data-testid="faq-question">
                <span>{item.q}</span>
                <Chevron />
              </summary>
              <div className={styles.answerWrap}>
                <p className={styles.answer}>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
