-- M11: link SearchConsoleLink to Page with a real FK (deletable via cascade).
-- Remove any orphan rows first so the FK constraint can be added safely.
DELETE FROM "SearchConsoleLink" scl
WHERE NOT EXISTS (SELECT 1 FROM "Page" p WHERE p."id" = scl."pageId");

ALTER TABLE "SearchConsoleLink"
  ADD CONSTRAINT "SearchConsoleLink_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;