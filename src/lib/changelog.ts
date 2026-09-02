/**
 * Product changelog (public marketing hub). Static, typed content — newest
 * entry first. `relatedPostSlug` links a release to its blog post where one
 * exists.
 */

import { getBlogPost } from "@/lib/blog";

export type ChangelogTag = "Feature" | "Improvement" | "Fix" | "Security";

export interface ChangelogEntry {
  version: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  tag: ChangelogTag;
  title: string;
  description: string;
  /** Optional blog post slug this release is announced in. */
  relatedPostSlug?: string;
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: "v2.0",
    date: "2026-09-02",
    tag: "Feature",
    title: "Meet your personal ranking agent",
    description:
      "NamesRanker is now a premium-only ranking engine: upload your resume and your personal agent studies you, publishes your works across the web, pitches you to podcasts and publications, and tracks your name on Google until it ranks. $1 for 7 full days, then $9/month launch pricing.",
    relatedPostSlug: "meet-your-personal-ranking-agent",
  },
  {
    version: "v1.4",
    date: "2026-08-25",
    tag: "Feature",
    title: "Name monitoring alerts",
    description:
      "Watch any variant of your name and get emailed the day a matching slug is claimed — before it becomes a problem.",
    relatedPostSlug: "sleep-easy-name-monitoring",
  },
  {
    version: "v1.3",
    date: "2026-08-19",
    tag: "Feature",
    title: "Search Console, per page",
    description:
      "Connect Google Search Console to any of your pages and see the queries, impressions, and position for your own name.",
    relatedPostSlug: "search-console-per-page",
  },
  {
    version: "v1.2",
    date: "2026-08-12",
    tag: "Feature",
    title: "Name protection, included in your plan",
    description:
      "One-word slugs stay exclusively yours while you're a member — enforced at the database level, no workarounds.",
    relatedPostSlug: "name-protection-included",
  },
  {
    version: "v1.1",
    date: "2026-07-30",
    tag: "Feature",
    title: "Custom domains, GA",
    description:
      "Point your own domain at your page with DNS verification and canonical care baked in — no code, no config files.",
    relatedPostSlug: "custom-domains-ga",
  },
  {
    version: "v1.0",
    date: "2026-07-22",
    tag: "Feature",
    title: "The public directory",
    description:
      "Search any name and compare descriptors to find the right professional — powered by fuzzy Postgres search.",
    relatedPostSlug: "public-directory-is-live",
  },
  {
    version: "v0.9",
    date: "2026-07-15",
    tag: "Feature",
    title: "Imports: RSS, GitHub, YouTube",
    description:
      "Full-text RSS, GitHub projects, and YouTube uploads sync automatically to premium pages and manually for everyone else.",
    relatedPostSlug: "bring-your-own-content",
  },
  {
    version: "v0.8",
    date: "2026-07-08",
    tag: "Improvement",
    title: "Simpler billing & grace periods",
    description:
      "One premium plan, three ways to pay, and a 30-day grace period that respects your one-word name.",
    relatedPostSlug: "simple-billing-no-lock-in",
  },
  {
    version: "v0.7",
    date: "2026-06-24",
    tag: "Security",
    title: "Race-safe name claims",
    description:
      "Every claim runs inside a transaction with a unique constraint, so no two people can ever land the same slug.",
  },
  {
    version: "v0.6",
    date: "2026-06-10",
    tag: "Fix",
    title: "Profile photos, no external hosting",
    description:
      "Profile photos are uploaded and served from our own infrastructure — validated by content sniffing, never by filename.",
  },
];

export function getChangelogEntry(version: string): ChangelogEntry | undefined {
  return changelogEntries.find((e) => e.version === version);
}

/** Resolve the blog post linked from a changelog entry, if any. */
export function relatedPost(entry: ChangelogEntry) {
  return entry.relatedPostSlug ? getBlogPost(entry.relatedPostSlug) : undefined;
}
