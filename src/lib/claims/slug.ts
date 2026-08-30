/**
 * Pure slug engine for the name-claim system (M4, spec §2.1–2.2, §3.4).
 *
 * No I/O here — every function is deterministic and unit-testable:
 * - normalizeName: trim / case / unicode (NFKD + diacritics) normalization
 * - countWords:    word count used for the one-word premium rule
 * - slugify:       base slug generation
 * - claimableSlugs: the claim chain `first-last` → `first-last-<keyword>` → `first-last-<keyword>-N`
 * - isValidCustomSlug: premium custom-handle validation
 */

export const MAX_NAME_LENGTH = 100;
export const MIN_SLUG_LENGTH = 3;
export const MAX_SLUG_LENGTH = 50;
export const MAX_NUMBERED_VARIANT = 10;

/**
 * Slugs that would collide with app routes or well-known endpoints
 * (spec §14 non-negotiable: one hub per person; slug must never shadow routes).
 */
export const RESERVED_SLUGS = new Set<string>([
  "admin",
  "api",
  "app",
  "assets",
  "blog",
  "contact",
  "dashboard",
  "directory",
  "docs",
  "error",
  "explore",
  "favicon",
  "favicon-ico",
  "help",
  "home",
  "index",
  "legal",
  "login",
  "logout",
  "magic-link",
  "mail",
  "names",
  "not-found",
  "onboarding",
  "pricing",
  "privacy",
  "robots",
  "search",
  "settings",
  "sitemap",
  "status",
  "support",
  "terms",
  "www",
]);

/**
 * Normalize a raw name: NFKD-unicode normalize, strip diacritics (Beyoncé → Beyonce),
 * trim, collapse internal whitespace, lowercase. Keeps the result readable/displayable.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Number of whitespace-separated words (0 for empty). Drives the one-word premium rule. */
export function countWords(name: string): number {
  const trimmed = name.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Base slug from a normalized name: only a-z0-9 kept, runs of other characters
 * become single hyphens, leading/trailing hyphens trimmed. E.g. "Jean-Luc O'Brien" → "jean-luc-o-brien".
 */
export function slugify(name: string): string {
  return normalizeName(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The claim candidate chain (spec §2.2):
 * 1. `first-last`
 * 2. if taken → `first-last-<keyword>`
 * 3. if both taken → append a number: `first-last-<keyword>-2`, `-3`, … up to MAX_NUMBERED_VARIANT.
 *
 * Without a keyword the chain is just the base slug — a taken base then requires
 * the user to pick a curated keyword variant (no free-text, spec §2.6).
 */
export function claimableSlugs(baseSlug: string, keyword?: string | null): string[] {
  if (!keyword) return [baseSlug];

  const variants: string[] = [`${baseSlug}-${keyword}`];
  for (let i = 2; i <= MAX_NUMBERED_VARIANT; i++) {
    variants.push(`${baseSlug}-${keyword}-${i}`);
  }
  return [baseSlug, ...variants];
}

/**
 * Premium custom-handle validation (spec §2.2.4):
 * lowercase alphanumeric segments joined by single hyphens, sane length, not reserved.
 */
export function isValidCustomSlug(slug: string): boolean {
  if (!slug) return false;
  if (slug !== slug.toLowerCase()) return false;
  if (slug.length < MIN_SLUG_LENGTH || slug.length > MAX_SLUG_LENGTH) return false;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return false;
  return !RESERVED_SLUGS.has(slug);
}
