# Agents.md — working rules for this repo

Operational rules every agent working in this repository must follow.

## Verification (required, nothing more)

- **No e2e tests. Ever.** Playwright runs are banned — do not launch them, do not fix specs as part of normal work. They add minutes of rebuild loops and are not required.
- The only required checks before finishing a change:
  1. `npx tsc --noEmit` — typecheck clean.
  2. `npx next build` — production build succeeds (this also covers static pages/404s).
  3. `npx prettier --write` on changed files.
- If an e2e spec references copy that changed, update the spec's strings in the same commit (cheap, keeps CI honest) — but never run the suite.

## Commits (micro commits)

- Commit small and often. One concern per commit (e.g., one page, one doc, one content group).
- Commit messages: short, descriptive, "why" over "what".
- Push after each small batch unless told otherwise.

## Content consistency (v2 positioning)

The product is **premium-only and agent-first**. The canonical offer, everywhere on public pages:

- **$1 unlocks 7 full days** (all features, no limits) → **day 8 auto-converts to $9/month** launch pricing → **$29/month** standard after the launch window.
- The user signs up, uploads a resume, and gets a **personal AI agent** in chat that studies, publishes, pitches, and tracks their name on Google.
- **No free tier** — copy must never promise one ("free for two-word names", "start free", "no credit card", etc.).
- No tier ladders: one plan, everything included.

## Legacy exception

The authenticated v1 member app (settings, name-claim upsells, Search Console/monitoring "Go Premium" buttons, plan labels) is **legacy pending the v2 cutover (milestones-v2.md → M10)**. Do not treat its internal gating copy as an inconsistency, and do not rework it in marketing-copy commits.
