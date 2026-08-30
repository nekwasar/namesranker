-- M4: one active hub-page claim per person (spec §3 — "Nobody can squat multiple
-- name-slugs"). The service layer checks first; this index closes the race.
-- RELEASED claims don't count, so a user can re-claim after a lapse.
CREATE UNIQUE INDEX "NameClaim_one_active_per_user_idx"
  ON "NameClaim"("claimedById")
  WHERE "status" IN ('CLAIMED', 'PROTECTED', 'PENDING_RELEASE');
