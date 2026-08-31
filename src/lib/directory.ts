/**
 * M8 — Directory (/names) data layer (spec §3.6, §7).
 *
 * - Fuzzy name search over live hub pages using Postgres `pg_trgm`
 *   (ILIKE trigram match + similarity ranking behind a GIN index).
 * - Profession + location filters, derived by parsing the descriptor.
 * - Offset pagination with total count.
 *
 * Pure helpers (parseDescriptor, buildFacets) live here and are unit-tested;
 * searchDirectory touches the DB via the tagged-template $queryRaw.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export const DIRECTORY_PAGE_SIZE = 12;
export const DIRECTORY_MAX_PAGE = Math.ceil(50_000 / DIRECTORY_PAGE_SIZE);

export type DirectorySort = "relevant" | "name" | "recent";

export interface DirectoryFilters {
  q: string;
  profession: string;
  location: string;
  page: number;
  sort: DirectorySort;
}

export interface DirectoryResult {
  path: string;
  title: string;
  name: string;
  descriptor: string | null;
  profession: string | null;
  location: string | null;
  photoUrl: string | null;
}

export interface DirectoryPage {
  filters: DirectoryFilters;
  results: DirectoryResult[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface DirectoryFacets {
  professions: string[];
  locations: string[];
}

/**
 * Parse a descriptor ("Product Designer · Austin, TX") into profession
 * and location parts. Supports "·", "|", and fallback heuristic if the
 * descriptor is a single token or comma-separated.
 */
export function parseDescriptor(descriptor: string | null | undefined): {
  profession: string | null;
  location: string | null;
} {
  if (!descriptor) return { profession: null, location: null };
  const text = descriptor.trim();
  if (!text) return { profession: null, location: null };

  const separator = ["·", "|", ","].find((s) => text.includes(s));
  if (!separator) {
    // Single token → profession only.
    return { profession: text, location: null };
  }
  const [first, ...rest] = text
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean);
  return { profession: first || null, location: rest.join(" · ").trim() || null };
}

interface RawRow {
  path: string;
  title: string;
  descriptor: string | null;
  photoUrl: string | null;
}

/** Query the directory with fuzzy search + filters + pagination. */
export async function searchDirectory(input: DirectoryFilters): Promise<DirectoryPage> {
  const q = input.q.trim();
  const profession = input.profession.trim();
  const location = input.location.trim();
  const page = Math.max(1, Math.min(input.page || 1, DIRECTORY_MAX_PAGE));
  const offset = (page - 1) * DIRECTORY_PAGE_SIZE;

  const where = buildWhere({ q, profession, location });
  const orderBy = buildOrderBy({ q, sort: input.sort });

  const rows = await prisma.$queryRaw<RawRow[]>(Prisma.sql`
    SELECT p.path, p.title, p.descriptor,
           u."profilePhotoUrl" AS "photoUrl"
    FROM "Page" p
    JOIN "User" u ON u.id = p."ownerId"
    WHERE p.status = 'LIVE' AND p."isHub" = true
      ${where}
    ORDER BY ${orderBy}
    LIMIT ${DIRECTORY_PAGE_SIZE} OFFSET ${offset}
  `);

  const countRes = await prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
    SELECT count(*)::bigint AS total
    FROM "Page" p
    JOIN "User" u ON u.id = p."ownerId"
    WHERE p.status = 'LIVE' AND p."isHub" = true
      ${where}
  `);

  const total = Number(countRes[0]?.total ?? 0);
  const results: DirectoryResult[] = rows.map((r) => {
    const parsed = parseDescriptor(r.descriptor);
    return {
      path: r.path,
      title: r.title,
      name: nameFromTitle(r.title),
      descriptor: r.descriptor,
      profession: parsed.profession,
      location: parsed.location,
      photoUrl: r.photoUrl,
    };
  });

  return {
    filters: { q, profession, location, page, sort: input.sort },
    results,
    total,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE)),
  };
}

/** Distinct profession + location facets from live hub pages' descriptors. */
export async function getDirectoryFacets(): Promise<DirectoryFacets> {
  const rows = await prisma.page.findMany({
    where: { status: "LIVE", isHub: true, descriptor: { not: null } },
    select: { descriptor: true },
    take: 2000,
  });
  return buildFacets(rows.map((r) => r.descriptor));
}

export function buildFacets(descriptors: (string | null)[]): DirectoryFacets {
  const professions = new Set<string>();
  const locations = new Set<string>();
  for (const d of descriptors) {
    const { profession, location } = parseDescriptor(d);
    if (profession) professions.add(profession);
    if (location) locations.add(location);
  }
  const sort = (a: string, b: string) => a.localeCompare(b);
  return {
    professions: Array.from(professions).sort(sort),
    locations: Array.from(locations).sort(sort),
  };
}

export function parseDirectoryParams(raw: {
  q?: string | string[];
  profession?: string | string[];
  location?: string | string[];
  page?: string | string[];
  sort?: string | string[];
}): DirectoryFilters {
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  const pageRaw = Number.parseInt(str(raw.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const sortRaw = str(raw.sort);
  const sort: DirectorySort = sortRaw === "name" || sortRaw === "recent" ? sortRaw : "relevant";
  return {
    q: str(raw.q),
    profession: str(raw.profession),
    location: str(raw.location),
    page,
    sort,
  };
}

/** The person's display name: strip the title suffix after " — " if present. */
export function nameFromTitle(title: string): string {
  const sep = title.indexOf(" — ");
  return sep === -1 ? title.trim() : title.slice(0, sep).trim();
}

function buildWhere({
  q,
  profession,
  location,
}: {
  q: string;
  profession: string;
  location: string;
}): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];
  if (q) {
    clauses.push(Prisma.sql`(
      lower(p.title) ILIKE ('%' || lower(${q}) || '%')
      OR p.path ILIKE ('%' || lower(${q}) || '%')
      OR lower(p.title) % lower(${q})
    )`);
  }
  if (profession) {
    clauses.push(
      Prisma.sql`lower(coalesce(p.descriptor, '')) ILIKE ('%' || lower(${profession}) || '%')`
    );
  }
  if (location) {
    clauses.push(
      Prisma.sql`lower(coalesce(p.descriptor, '')) ILIKE ('%' || lower(${location}) || '%')`
    );
  }
  return clauses.length ? Prisma.sql`AND ${Prisma.join(clauses, " AND ")}` : Prisma.empty;
}

function buildOrderBy({ q, sort }: { q: string; sort: DirectorySort }): Prisma.Sql {
  if (sort === "name") return Prisma.sql`lower(p.title), p.path`;
  if (sort === "recent") return Prisma.sql`p."publishedAt" DESC NULLS LAST`;
  // Relevant order: exact-token matches first (similarity), then fuzzy-token,
  // then most recently published. When no query, fall back to recent.
  if (!q) return Prisma.sql`p."publishedAt" DESC NULLS LAST`;
  return Prisma.sql`
    greatest(similarity(lower(p.title), lower(${q})), similarity(lower(p.path), lower(${q}))) DESC,
    lower(p.title), p.path
  `;
}
