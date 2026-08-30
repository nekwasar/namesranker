import { prisma } from "@/lib/db";
import { sendEmail, claimConfirmationEmail } from "@/lib/email";
import { config } from "@/lib/config";
import {
  claimableSlugs,
  countWords,
  isValidCustomSlug,
  MAX_NAME_LENGTH,
  normalizeName,
  slugify,
} from "@/lib/claims/slug";
import type { ClaimStatus, ClaimType, NameClaim } from "@/generated/prisma/client";

/**
 * Name-claim engine (M4, spec §2 and §3.4).
 *
 * Rules enforced here — never trust the client:
 * - One-word names are always premium (spec §2.1). No workaround.
 * - Two-word names are free; base slug is `first-last`.
 * - Slug chain: `first-last` → `first-last-<keyword>` → `first-last-<keyword>-N` (spec §2.2).
 * - Keywords come from the curated `Keyword` table only (spec §2.6).
 * - Custom handles are premium-only (spec §2.2.4).
 * - One hub page per person: one active claim per user (spec §3).
 * - One-word claims are PROTECTED while subscribed (spec §2.3).
 * - Race safety: create inside the DB's unique constraint; on a slug P2002 conflict
 *   retry the next variant. No double-claims.
 */

export type ClaimErrorCode =
  | "invalid_name"
  | "one_word_premium"
  | "custom_slug_premium_required"
  | "invalid_custom_slug"
  | "invalid_slug"
  | "invalid_keyword"
  | "keyword_required"
  | "no_slug_available"
  | "already_claimed"
  | "premium_required"
  | "path_taken"
  | "connector_limit"
  | "not_found";

export class ClaimError extends Error {
  constructor(
    public code: ClaimErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "ClaimError";
  }
}

/** Entitlement helper (spec §3.10) — the source of truth is the DB row, not the session. */
export function isPremium(user: { plan: string }): boolean {
  return user.plan === "PREMIUM";
}

export interface ClaimParams {
  userId: string;
  email: string;
  name: string;
  keyword?: string | null;
  customSlug?: string | null;
}

export interface ClaimResult {
  claim: NameClaim;
  pageUrl: string;
}

/** The public URL a claim maps to — hub page will live at /<slug> once published (M5). */
export function claimPageUrl(slug: string): string {
  return `https://${config.baseDomain}/${slug}`;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Fields of the violated unique constraint.
 * Prisma 7 + the pg driver adapter reports them under
 * `meta.driverAdapterError.cause.constraint.fields`; older clients used `meta.target`.
 */
function uniqueViolationFields(err: unknown): string[] {
  if (typeof err !== "object" || err === null) return [];
  const e = err as {
    meta?: {
      target?: unknown;
      driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } };
    };
  };
  if (Array.isArray(e.meta?.target)) return e.meta.target as string[];
  const adapterFields = e.meta?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(adapterFields)) return adapterFields as string[];
  return [];
}

/** Slug-conflicts (unique on NameClaim.slug) trigger a variant retry. */
function isSlugConflict(err: unknown): boolean {
  if (!isUniqueViolation(err)) return false;
  return uniqueViolationFields(err).includes("slug");
}

export async function claimName({
  userId,
  email,
  name,
  keyword = null,
  customSlug = null,
}: ClaimParams): Promise<ClaimResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ClaimError("not_found");

  const normalized = normalizeName(name);
  const words = countWords(normalized);
  if (!normalized || words === 0 || normalized.length > MAX_NAME_LENGTH) {
    throw new ClaimError("invalid_name");
  }

  // One hub page per person (spec §3): a user can hold only one active claim.
  const existing = await prisma.nameClaim.findFirst({
    where: {
      claimedById: userId,
      status: { in: ["CLAIMED", "PROTECTED", "PENDING_RELEASE"] },
    },
    select: { slug: true },
  });
  if (existing) throw new ClaimError("already_claimed");

  const premium = isPremium(user);
  const isOneWord = words === 1;

  let type: ClaimType;
  let status: ClaimStatus = "CLAIMED";
  let keywordValue: string | null = null;
  let candidates: string[];

  if (isOneWord) {
    // One-word names are always premium, no workaround (spec §2.1).
    if (!premium) throw new ClaimError("one_word_premium");
    type = "ONE_WORD";
    status = "PROTECTED"; // exclusive while subscribed (spec §2.3)
    candidates = [slugify(normalized)];
  } else if (customSlug) {
    if (!premium) throw new ClaimError("custom_slug_premium_required");
    if (!isValidCustomSlug(customSlug)) throw new ClaimError("invalid_custom_slug");
    type = "CUSTOM";
    candidates = [customSlug];
  } else {
    const base = slugify(normalized);
    if (!base) throw new ClaimError("invalid_name");

    if (keyword) {
      // Curated keyword list only (spec §2.6) — no free-text.
      const keywordRow = await prisma.keyword.findFirst({
        where: { keyword },
        select: { id: true },
      });
      if (!keywordRow) throw new ClaimError("invalid_keyword");
      type = "KEYWORD";
      keywordValue = keyword;
    } else {
      type = "STANDARD";
    }
    candidates = claimableSlugs(base, keyword || null);
  }

  // Race-safe claim: each create is its own transaction; the unique slug constraint
  // guarantees only one claimer wins a slug. On a slug conflict, retry the next variant.
  let claim: NameClaim | null = null;
  for (const slug of candidates) {
    try {
      claim = await prisma.nameClaim.create({
        data: {
          slug,
          wordCount: words,
          type,
          status,
          claimedById: userId,
          keyword: keywordValue,
        },
      });
      break;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (isSlugConflict(err)) {
        // A bare (non-keyword) claim that loses its base slug must offer a
        // professional variant instead (spec §2.2.2).
        if (type === "STANDARD") throw new ClaimError("keyword_required");
        continue;
      }
      // Any other unique conflict — e.g. the one-active-claim-per-user partial
      // index — means this user already holds an active claim.
      throw new ClaimError("already_claimed");
    }
  }

  if (!claim) throw new ClaimError("no_slug_available");

  // Confirmation email (spec §3.4 / §3.11). Claim already succeeded — a mail
  // failure must never roll back the claim.
  try {
    await sendEmail(claimConfirmationEmail(email, claim.slug, claimPageUrl(claim.slug)));
  } catch (err) {
    console.error(`Claim confirmation email failed for ${claim.slug}:`, err);
  }

  return { claim, pageUrl: claimPageUrl(claim.slug) };
}
