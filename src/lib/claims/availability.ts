import { prisma } from "@/lib/db";
import { countWords, normalizeName, slugify } from "@/lib/claims/slug";
import type { ClaimStatus } from "@/generated/prisma/client";

/**
 * Availability layer for the scarcity engine (M4, spec §2.7 and §3.4):
 * - live availability of a name's slug chain ("`john-smith` is still available")
 * - curated keyword variants (spec §2.6) with their claimable fallbacks
 * - "who claimed it recently" feed
 */

/** Claims that still own their slug. RELEASED means the slug is back in the pool. */
const ACTIVE_STATUSES: ClaimStatus[] = ["CLAIMED", "PROTECTED", "PENDING_RELEASE"];

export interface SlugVariant {
  keyword: string;
  /** Primary candidate: `first-last-<keyword>` */
  slug: string;
  available: boolean;
  /** Numbered fallback: `first-last-<keyword>-2` (spec §2.2.3) */
  fallbackSlug: string;
  fallbackAvailable: boolean;
}

export interface AvailabilityResult {
  /** Normalized display name */
  name: string;
  /** Base slug `first-last` */
  slug: string;
  wordCount: number;
  isOneWord: boolean;
  baseAvailable: boolean;
  /** Keyword variants for the requested profession (empty unless profession given) */
  variants: SlugVariant[];
  /** True if any candidate in the chain is claimable right now */
  claimable: boolean;
}

export async function getAvailability(
  name: string,
  profession?: string | null
): Promise<AvailabilityResult> {
  const normalized = normalizeName(name);
  const wordCount = countWords(normalized);
  const isOneWord = wordCount === 1;
  const base = slugify(normalized);

  const keywords = profession
    ? await prisma.keyword.findMany({
        where: { profession },
        orderBy: { keyword: "asc" },
        select: { keyword: true },
      })
    : [];

  // One query for every candidate we care about (base + per-keyword primary/fallback).
  const candidateSlugs = new Set<string>([base]);
  const variants: SlugVariant[] = keywords.map((k) => {
    const slug = `${base}-${k.keyword}`;
    const fallbackSlug = `${base}-${k.keyword}-2`;
    candidateSlugs.add(slug);
    candidateSlugs.add(fallbackSlug);
    return { keyword: k.keyword, slug, available: false, fallbackSlug, fallbackAvailable: false };
  });

  const claimed = await prisma.nameClaim.findMany({
    where: { slug: { in: Array.from(candidateSlugs) }, status: { in: ACTIVE_STATUSES } },
    select: { slug: true },
  });
  const taken = new Set(claimed.map((c) => c.slug));

  for (const variant of variants) {
    variant.available = !taken.has(variant.slug);
    variant.fallbackAvailable = !taken.has(variant.fallbackSlug);
  }

  const baseAvailable = !taken.has(base);
  const claimable = baseAvailable || variants.some((v) => v.available || v.fallbackAvailable);

  return { name: normalized, slug: base, wordCount, isOneWord, baseAvailable, variants, claimable };
}

export interface RecentClaim {
  slug: string;
  claimedAt: Date;
  ago: string;
}

/** "Who claimed it recently" feed (spec §3.4) — newest first. */
export async function getRecentClaims(limit = 6): Promise<RecentClaim[]> {
  const claims = await prisma.nameClaim.findMany({
    where: { status: { in: ACTIVE_STATUSES } },
    orderBy: { claimedAt: "desc" },
    take: limit,
    select: { slug: true, claimedAt: true },
  });
  return claims.map((c) => ({ slug: c.slug, claimedAt: c.claimedAt, ago: timeAgo(c.claimedAt) }));
}

export interface ProfessionKeywords {
  profession: string;
  keywords: string[];
}

/** Curated keywords (spec §2.6). With a profession: that group only; otherwise all groups. */
export async function getKeywords(profession?: string | null): Promise<ProfessionKeywords[]> {
  const rows = await prisma.keyword.findMany({
    where: profession ? { profession } : undefined,
    orderBy: [{ profession: "asc" }, { keyword: "asc" }],
    select: { profession: true, keyword: true },
  });

  const byProfession = new Map<string, string[]>();
  for (const row of rows) {
    const list = byProfession.get(row.profession) ?? [];
    list.push(row.keyword);
    byProfession.set(row.profession, list);
  }

  return Array.from(byProfession.entries()).map(([professionName, keywords]) => ({
    profession: professionName,
    keywords,
  }));
}

/** Compact relative time for scarcity copy: "just now", "5m ago", "3h ago", "2d ago". */
export function timeAgo(date: Date, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
