/**
 * SEO score for the per-page SEO editor (M6, spec §5.3 / milestones §3.7).
 * A simple, explainable heuristic (0–100):
 * - meta title length (ideal 30–60 chars):   up to 40 pts
 * - meta description length (ideal 70–160):  up to 40 pts
 * - descriptor present:                      10 pts
 * - content depth (sections with content):   up to 10 pts
 */

export interface SeoScoreContext {
  metaTitle: string | null;
  metaDescription: string | null;
  descriptor: string | null;
  /** Number of non-empty content sections (bio, socials, experience, projects, publications, testimonials). */
  contentSignals: number;
}

export const SEO_TITLE_IDEAL_MIN = 30;
export const SEO_TITLE_IDEAL_MAX = 60;
export const SEO_DESC_IDEAL_MIN = 70;
export const SEO_DESC_IDEAL_MAX = 160;

export function computeSeoScore(ctx: SeoScoreContext): number {
  let score = 0;

  const title = ctx.metaTitle?.trim() ?? "";
  const desc = ctx.metaDescription?.trim() ?? "";

  if (title.length === 0) {
    // no-op
  } else if (title.length >= SEO_TITLE_IDEAL_MIN && title.length <= SEO_TITLE_IDEAL_MAX) {
    score += 40;
  } else if (title.length >= 15) {
    score += 20;
  } else {
    score += 10;
  }

  if (desc.length === 0) {
    // no-op
  } else if (desc.length >= SEO_DESC_IDEAL_MIN && desc.length <= SEO_DESC_IDEAL_MAX) {
    score += 40;
  } else if (desc.length >= 50) {
    score += 25;
  } else {
    score += 10;
  }

  if (ctx.descriptor) score += 10;
  score += Math.min(10, Math.max(0, ctx.contentSignals) * 2);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Number of non-empty content sections for a page, driving the depth signal. */
export function countContentSignals(page: {
  descriptor?: string | null;
  bio?: unknown;
  socials?: unknown;
  experience?: unknown;
  projects?: unknown;
  publications?: unknown;
  testimonials?: unknown;
}): number {
  let signals = 0;
  if (page.descriptor) signals++;
  if (Array.isArray(page.socials) && page.socials.length > 0) signals++;
  if (Array.isArray(page.experience) && page.experience.length > 0) signals++;
  if (Array.isArray(page.projects) && page.projects.length > 0) signals++;
  if (Array.isArray(page.publications) && page.publications.length > 0) signals++;
  if (Array.isArray(page.testimonials) && page.testimonials.length > 0) signals++;
  if (typeof page.bio === "string" && page.bio.trim().length > 0) signals++;
  return signals;
}
