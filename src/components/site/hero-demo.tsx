"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./hero-demo.module.css";
import pageStyles from "@/app/landing.module.css";

function titleFor(name: string): string {
  if (!name.trim()) return "Your name";
  return name.trim();
}

function slugFor(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "your-name"
  );
}

const thirdParty = [
  { label: "LinkedIn", url: "linkedin.com/in/" },
  { label: "Old news mention", url: "news.example.com/" },
];

export function HeroSection() {
  return (
    <div className={pageStyles.heroInner}>
      <div className={pageStyles.heroCopy}>
        <span className={pageStyles.eyebrow}>
          <span className={pageStyles.liveDot} /> Your personal ranking agent
        </span>
        <h1 className={pageStyles.heroTitle}>
          Your name, <em>ranked for you</em>.
        </h1>
        <p className={pageStyles.heroSub}>
          NamesRanker gives you a personal AI agent. Upload your resume, and it studies who you are,
          publishes your work across the web, and pitches you to podcasts and publications — then
          tracks your name on Google until you own the #1 result. You approve; it does the work.
        </p>

        <div className={pageStyles.heroCta}>
          <Link href="/onboarding" className={pageStyles.ctaPrimary}>
            Start your $1 trial
          </Link>
          <Link href="#how-it-works" className={pageStyles.ctaSecondary}>
            Meet your agent
          </Link>
        </div>
        <div className={pageStyles.trust}>
          <span>Resume in, agent on the job</span>
          <span>7 full days for $1</span>
          <span>Cancel anytime</span>
        </div>
      </div>

      <div className={pageStyles.heroVisual}>
        <HeroDemo />
      </div>
    </div>
  );
}

export default function HeroDemo() {
  const [name] = useState("Sarah Chen");
  const slug = slugFor(name);

  return (
    <div className={styles.wrap}>
      <div className={styles.browser}>
        <div className={styles.bar}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.url}>
            google.com/search?q={encodeURIComponent(name || "your name")}
          </span>
        </div>

        <div className={styles.search}>
          <p className={styles.searchInput}>
            <span className={styles.searchHint}>Search</span> {name || "your name"}
          </p>
          <div className={styles.searchIcons} aria-hidden="true">
            <span>×</span>
            <span>⌕</span>
          </div>
        </div>

        <div className={styles.toolbar} aria-hidden="true">
          <span>All</span>
          <span>Images</span>
          <span>Videos</span>
          <span>News</span>
          <span>Maps</span>
        </div>

        <div className={styles.results}>
          <p className={styles.count} aria-hidden="true">
            About 11,400 results
          </p>
          {/* The agent at work */}
          <div className={styles.agent}>
            <span className={styles.agentDot} aria-hidden="true" />
            <span className={styles.agentText}>
              <strong>{titleFor(name)}&apos;s agent</strong> — published 2 works · pitched 3
              podcasts · <em>“{titleFor(name)}”</em> #23 → #3 this month
            </span>
          </div>
          {/* #1 — the NamesRanker page */}
          <div className={`${styles.result} ${styles.top}`}>
            <div className={styles.resultMeta}>
              <span className={styles.resultHead}>
                <span className={styles.favicon} aria-hidden="true" />
                <span>
                  NamesRanker{" "}
                  <span className={styles.userCount} title="Ranked #1">
                    ★ #1 result
                  </span>
                </span>
              </span>
              <span className={styles.resultUrl}>namesranker.com/{slug}</span>
            </div>
            <p className={styles.resultTitle}>{titleFor(name)} — the #1 result for your name</p>
            <p className={styles.resultSnippet}>
              The definitive page for {titleFor(name)} — profile, work, and publications, kept fresh
              and ranked by a personal AI agent.
            </p>
          </div>

          {/* Third-party results */}
          {thirdParty.map((c) => (
            <div key={c.label} className={`${styles.result} ${styles.dim}`}>
              <div className={styles.resultMeta}>
                <span className={styles.resultHead}>
                  <span className={styles.favicon} aria-hidden="true" />
                  <span>Third-party</span>
                </span>
                <span className={styles.resultUrl}>
                  {c.url}
                  {slug}
                </span>
              </div>
              <p className={styles.resultTitle}>
                {titleFor(name)} — on {c.label}
              </p>
              <p className={styles.resultSnippet}>
                A page about {titleFor(name)} you don&apos;t control and don&apos;t rank for.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
