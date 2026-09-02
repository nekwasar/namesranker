# NamesRanker — Product Plan v2

> **One line:** NamesRanker continuously **studies** a person, **publishes their works across the internet**, **pitches them to external sites**, and **tracks/improves how their name ranks on Google** — done for you by a personal AI agent.

Not "a hosted page for your name" — a machine that **gets your name ranked for you**. The page is one output of the machine, not the product.

---

## 1. Why this wins (the mechanism)

Google doesn't rank "a profile" — it builds an **entity** (a Knowledge Graph node for the person) from consistent signals across the web. Same name + same photo + same descriptor line ("Name · Senior Software Engineer at Acme, Lagos") appearing on many pages Google trusts → Google decides these pages are all about *one person* → ranks them together; the most authoritative becomes #1.

**Ranking a name is a consistency game, not a content game.** Deterministic playbook:

1. **Entity forms** — N indexed properties carry an identical identity fingerprint (name, photo, descriptor).
2. **Authority accrues** — each property is optimized, cross-linked, and pushed into Google's index.
3. **Off-page fuel** — external sites (podcasts, guest posts, directories) add neutral third-party signals that the person is real and the name is theirs.
4. **Rank line moves** — measured weekly; keep feeding whichever properties are climbing.

**The promise (honest, verifiable):** not "guaranteed #1" (no one can promise that) — but *"by day 90 your name has a Google-visible identity: your property web live and indexed, placements secured or in motion, junk results pushed down, and a live rank chart showing the line moving. We run the entire playbook continuously; you approve and watch."*

---

## 2. Product surfaces

### Public (acquisition + proof)
- Landing, pricing, blog, use-cases, FAQ, changelog — the blog is the **acquisition engine** (people who search "how to rank my name on Google" land here).
- **Case studies** (with permission): before/after SERP screenshots, rank-line journeys. Proof marketing replaces the free-tier viral loop.

### Authenticated — exactly three pages
1. **Chat (the agent)** — *the homepage for authenticated users.* Everything happens here: onboarding, approvals, work log, rank updates, pitches.
2. **Profile** — the user's public hub + identity-web status (what's live, what's indexed, what the agent is building next).
3. **Settings** — account, billing ($1 trial / $29 plan), permissions (what the agent may do), security.

**The agent does all the rest of the work.** There are no content editors, import screens, monitoring dashboards, or SEO tools pages for the user. Every capability the platform has is a tool the agent wields on the user's behalf. This is the radical simplification: user-facing complexity collapses to zero; capability moves behind the agent.

---

## 3. Onboarding (the funnel)

1. **Signup** (email/password, verified) — resume upload is the *only* required input after that.
2. **Resume → Footprint Graph** — AI-parsed into structured data: person → works → skills → profiles → queries. Kills all form-drudgery; one artifact every professional owns.
3. **Straight into chat with the agent** — the agent opens with:
   > *"Send me your resume and any links you have. I'll study you overnight, map what Google already shows for your name, and bring you a plan: what we'll build, where we'll pitch you, and your baseline rank. Approve what makes sense, and I'll run it."*
4. **7-day full-power trial** proves the machine (see §7).

---

## 4. The Agent (core architecture)

**One agent built once; instantiated per user as their personal worker.** It owns:

- **Memory** — the user's Footprint Graph + conversation history + preferences.
- **Permission envelope** — user-set rules ("auto-syndicate to Medium and Dev.to", "show me drafts for LinkedIn", "never touch my GitHub", "no pitches to my current employer's clients"). The agent only ever acts inside the envelope; the envelope is adjustable in Settings.
- **Approval queue** — drafts, pitches, and consequential actions land here in-chat. One-tap approve. Everything is logged to the user's work feed (trust through visibility, never permission-seeking on every micro-action).

**The agent's tools are the engines in §5.** The engine is built once; the agent is the brain and voice that operates the user's instance.

---

## 5. The engines (what the agent can do)

### A. Study — the Listener
- Polls authorized sources (RSS, webhooks, APIs) continuously for new work. New blog post → engine knows within hours.
- **Discovery:** scans the web for the user's existing footprint (name + profession queries, verified via resume links) → **Footprint Gap Report**: "You have LinkedIn, GitHub, and an abandoned Medium. No podcast presence; GitHub bio has no link. Here's what to plug, in order."

### B. Transform — the Transformer
Every republish is a **transform**, never a duplicate: fresh angle per platform (career-angle on LinkedIn, deep-dive on Medium, code-first on GitHub) + canonical link to the original. Duplicates are how names *don't* rank; transforms are how the entity grows. **Sacred rule.**

### C. Publish — the Syndicator
- Owned surfaces first: user's hub on namesranker.com, topic pages, directory.
- Then connected accounts, per the **API tier matrix**:

| Tier | Platforms | Method |
|---|---|---|
| Full API | GitHub, WordPress, Ghost, Dev.to, YouTube, Blogger, Google Business | True OAuth — engine reads, transforms, publishes automatically |
| Limited | Medium (token), X, Reddit | API throttled — engine does most, user confirms on cadence |
| Closed | LinkedIn, Instagram, TikTok | Engine **prepares everything** (post, images, links, timing); user pastes in ~30s inside chat. Still gets done — just not hands-free |

- **Account-less channels carry the load first** (fast wins, zero setup): hub page, Google Business Profile, directory listings, **aggregator/junk cleanup** (most professionals' #1 problem is their name already being occupied by data-broker junk — suppressing it is the fastest win), podcast/guest-pitch placements.

### D. Pitch — the Outreach Engine (finding + pitching at scale)
1. **Opportunity Ledger** — continuously maintained DB of pitchable surfaces per profession: podcasts, "write for us" blogs, niche directories (Martindale for lawyers, Healthgrades for doctors, Zillow for agents…), journalist request platforms (Connectively/HARO, Qwoted, Featured), conferences/AMAs.
2. **Weekly matching** — match users to ledger entries by niche + profile strength + goals; draft the pitch from their real credentials (120 words, audience-aware).
3. **Batch approval in chat** — "Pitch you to these 5 podcasts?" — one tap.
4. **Sending with hygiene** — per-domain rate limits, per-pitch personalization, no spray-and-pray (protects the user's name from spam damage).
5. **Fulfillment kit** — on acceptance, hand the host a one-page kit (bio, headshot, topics, links) → near-zero friction → the published page drops into the entity.
6. **Reply tracking → learning** — winning angles per niche feed back into the generator.

### E. Rank — the Tracker
- Watched queries ("john smith software engineer"), SERP snapshots, position history, movement alerts in chat ("🎉 #7 → #3 for 'john smith engineer'").

---

## 6. The profession → hub matrix

Niche-specific, not generic. Per-profession authority hubs (curated, ranked by Google authority × ease of winning):

| Profession | Priority hubs |
|---|---|
| Developers | GitHub, Stack Overflow, Dev.to, npm/PyPI, personal dev blog |
| Academics | Google Scholar, ORCID, ResearchGate, university pages |
| Designers | Behance, Dribbble, Figma community |
| Writers | Medium, Substack, Muck Rack, bylines |
| Doctors | Healthgrades, hospital bios, PubMed |
| Lawyers | Martindale–Hubbell, Avvo, bar-association pages |
| Consultants/Execs | LinkedIn, Crunchbase, company bio, podcasts |
| Creators | YouTube, Spotify, TikTok, newsletters |
| Real estate | Zillow, Realtor profile pages |
| Engineers (non-dev) | LinkedIn, company pages, conferences, patents, publications |

---

## 7. Revenue model (premium-only)

- **No free tier.** Positioning: "help us help you" — the service is offered to people who know its worth; the funnel + framing repel tire-kickers by design.
- **$1 trial deposit** → unlocks **7 full days, all features, no limits** (collects the card, filters the unserious).
- **Day 8: auto-convert to $9/month — the launch promo rate for early members.** Cancel anytime before day 8 and nothing further is charged; the $1 deposit is refundable if canceled in-trial. After the launch window closes, new members pay the **standard $29/month**.
- **Decision (made):** auto-convert on day 8, no explicit upgrade step. Rationale: the week's purpose is proving the machine — if the first win lands in-trial, converting silently is a kindness; cancel-anytime + refundable deposit keeps it honest. Launch is monthly-only (no annual/lifetime tiers until demand justifies them).
- Stripe shape: $1 one-time invoice (captures payment method) → 7-day subscription trial (`trial_period_days: 7`) → subscription on the **$9 promo Price** from day 8; standard **$29 Price** is used for all signups after the promo window (a flag on the checkout route switches the Price ID).

**The seven-day first-win requirement (hard spec):** the trial must visibly move the user's rank line in one week — SERP baseline day 1, first indexed property + visible movement by day 7. This is the vet-to-rank proof, and the trial build must hit it.

---

## 8. Growth

- **Proof marketing:** case studies (before/after SERP), rank-line journeys, a public showcase — all opt-in.
- **Referrals among premium users** (their network is exactly the ICP).
- **Content-led acquisition:** blog/guides/use-cases rank for "how to rank my name on Google" → funnel into the $1 trial.
- **The agent is the retention loop:** weekly report card in chat ("this week: 2 pieces published, 1 podcast pitch accepted, your name moved #11 → #6").

---

## 9. Integrity rules (non-negotiable)

- Only publish the user's **own works**; never scrape others, never auto-generate content on their behalf.
- No link schemes; rate/ToS limits per target respected; transforms + canonicals on every syndicated copy. One spam strike on the platform domain damages every user's rankings.
- We **never create accounts** for users on third-party platforms (automated signup is banned everywhere and would burn the platform). We discover + optimize existing ones, and make the few genuinely-needed signups a ~90-second pre-filled flow the user completes themselves.
- Data minimization: everything from user-authorized sources; user owns their data; GDPR export/delete retained.

---

## 10. What this means for the current codebase

- **Keep:** auth (password + magic link, verification, reset), resume-safe infra, public marketing site, blog/authors/use-cases/FAQ, billing base, the engines already built (listener/imports, transform-ready content model, publisher targets, custom-domain + monitoring + rank plumbing) — all become **agent tools**, not user screens.
- **Collapse:** settings/content/import/monitoring/seo-editor UIs get absorbed into the chat + profile + settings shell. No new feature ships as a user page; it ships as an agent action.
- **Build new:** the agent runtime (one brain, per-user instances, memory, tool permissions, approval queue), chat UI (the authenticated homepage), in-chat onboarding (resume → graph → first plan), the discovery engine (Gap Report), the pitching ledger, and the rank dashboard feed.
- **Remove/reprice:** free-tier gates disappear — the product is one $29 plan behind the $1 trial.

---

## 11. Build sequencing (high level)

1. **App shell + agent runtime** — three-page auth'd app, chat as home, agent memory + permission envelope + approval queue.
2. **Resume-in onboarding** — upload → parse → Footprint Graph → first plan → SERP baseline (day-1 win).
3. **Syndication as agent tools** — migrate existing publisher/imports into agent tool calls; transform rule enforced.
4. **Discovery + Gap Report.**
5. **Pitching ledger + outreach engine** (starting with one profession to prove reply rates).
6. **Revenue flow** — $1 trial deposit → 7 days → $9/mo promo auto-convert on day 8 (standard $29 after the launch window), end to end.
7. **Rank tracker + weekly report card** (the retention loop).
8. **Proof-marketing surface** — case studies + public showcase.
