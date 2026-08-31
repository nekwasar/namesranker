-- M8 — Directory search (spec §3.6): fuzzy name search over live hub pages.
-- pg_trgm enables trigram similarity (ILIKE %..% + similarity()) backed by GIN indexes.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Name search target: page title (person display name), lowercased for index use.
CREATE INDEX "Page_title_trgm_idx" ON "Page" USING gin (lower(title) gin_trgm_ops);

-- Filter target: descriptor (profession · location), lowercased.
CREATE INDEX "Page_descriptor_trgm_idx"
  ON "Page" USING gin (lower(coalesce(descriptor, '')) gin_trgm_ops);