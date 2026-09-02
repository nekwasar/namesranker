# NamesRanker v2 — Technical Plan & Milestones

> Companion to `product-plan-v2.md` (the what/why) and `product-spec.md` + `milestones.md` (v1, historical). This doc is the **how** — architecture, code reuse, and the milestone series that takes the platform from "hosted link pages behind a paywall" to **an automated name-ranking engine run by a per-user AI agent**.

Status: planning. M0 is the ratification milestone; nothing in M1+ starts before M0 closes.

---

## 1. Target state (one screenful)

Authenticated app = **exactly three pages**:

1. **Chat** — the user's personal agent. Homepage for signed-in users. Everything happens here.
2. **Profile** — their public hub + identity-web status (what's live, indexed, next).
3. **Settings** — account, billing ($1 → 7d → $9), **permission envelope**, security.

After signup the only input is a **resume**; the user is then dropped into chat with their agent. The agent does all the rest of the work using the five engines (Study → Transform → Publish → Pitch → Track). Public site (landing, blog, use-cases, FAQ, pricing, changelog) stays as the acquisition + proof surface.

---

## 2. System architecture

### 2.1 One agent, per-user instances

- **One agent brain** (shared code + model config) instantiated per user as their personal worker. No per-user model training — per-user **state and context**.
- Per-user instance owns:
  - **Footprint Graph** — structured model of the person: `person → works → skills → profiles → watched queries → gap report`.
  - **Memory** — conversation history + agent working notes, stored per user (DB, not context-only).
  - **Permission envelope** — user-set policy: `never-touch | draft-only | copy-approve | full-auto` per surface (platforms, content types, pitch categories).
  - **Approval queue** — every consequential action lands here for one-tap approve; full work log.
- Agent loop: events (new source item, SERP movement, reply received, user message) → plan → tools → log → report in chat. All tool actions persist to an audit/work log the user can replay.

### 2.2 The engines are tool registries

The agent doesn't contain logic; it orchestrates **tools**, each backed by a service:

| Engine | Service | What it does |
|---|---|---|
| Study | `ListenerService` | Poll authorized sources (RSS/webhooks/APIs); Discovery scan → Gap Report |
| Transform | `TransformerService` | One work → N platform-ready variants; enforces transform + canonical rules |
| Publish | `PublisherService` | Post per API-tier matrix; LinkedIn/closed surfaces produce a paste-kit |
| Pitch | `OutreachService` | Opportunity Ledger, matching, pitch drafting, batch approval, fulfillment kits, reply tracking |
| Track | `RankService` | SERP snapshots for watched queries, position history, movement alerts, weekly report card |

### 2.3 Platform API tiers (write capability)

| Tier | Platforms | Mode |
|---|---|---|
| Full API | GitHub, WordPress, Ghost, Dev.to, YouTube, Blogger, Google Business | True OAuth; agent publishes automatically |
| Limited | Medium (token), X, Reddit | API throttled; agent publishes after confirm (or on cadence per envelope) |
| Closed | LinkedIn, Instagram, TikTok | Agent prepares a **paste-kit**; user pastes in-chat (~30s); agent confirms + logs |

Account-less channels (hub page, directory, Google Business, aggregator-junk cleanup, guest/podcast placements) run first — zero setup, fast wins.

### 2.4 Identity web (the ranking mechanism)

Every connected property carries the **same descriptor + photo** and cross-links with descriptive anchors. Rank tracking proves the loop: entity forms → authority accrues → off-page fuel → rank line moves. Canonical/transform rules are **enforced by the Transformer**, not by policy.

---

## 3. What we reuse from the v1 codebase

| v1 asset | v2 disposition |
|---|---|
| Auth (password + magic link, verify, reset, session, middleware) | **Keep**; add resume-first onboarding route |
| User/Page/ContentBlock/Imports/claims data model | **Migrate** into Footprint Graph entities; claim/slug system stays as the asset being ranked |
| Import connectors (RSS/GitHub/YouTube) | Become `ListenerService` tools |
| Public-page rendering (ISR, JSON-LD, canonicals, sitemap, robots) | **Keep as-is** — the hub output of the Publish engine |
| Custom domains + Search Console + monitoring | Become agent tools (Profile status + Settings) |
| Stripe checkout/webhook base | Extend for $1 invoice → trial → $9 auto-convert |
| Public marketing site (blog/use-cases/FAQ/changelog/pricing) | Keep; copy already aligned to v2; pricing page shows the new offer |
| Admin console | Keep (agent approval/abuse review surface) |

**Collapse rule:** no new feature ships as a user page; it ships as an agent action.

---

## 4. Revenue mechanics (Stripe)

1. Signup (email/password, verified) → upload resume → **$1 deposit invoice** (captures payment method; `payment_behavior: default_incomplete` → confirms card).
2. Subscription created with `trial_period_days: 7`, payment method attached.
3. Day 8: Stripe starts billing on the **$9 promo Price** (auto-convert — no user action).
4. Promo window flag: while `PROMO_PRICE_ACTIVE`, checkout uses the $9 Price; after launch, the **$29 standard Price**.
5. Trial-period cancel → no further charge; deposit refunded. Dunning for failed $9 charges; membership pauses on failure after grace.
6. Weekly report card (chat) is the retention hook that makes day-8 conversion a non-event.

---

## 5. Data model deltas (design sketch — schema in M0)

New tables (Postgres + JSONB where sensible):

- `AgentState` (userId, footprint JSON, permission envelope JSON, agent notes)
- `ConversationMessage` (userId, role, content, toolCalls, createdAt)
- `ApprovalItem` (userId, kind, payload, status, decidedAt)
- `WorkLog` (userId, action, tool, status, metadata, createdAt) — the audit trail
- `SyncedProfile` (userId, platform, tier, oauth token ref, url, descriptor, status)
- `PublishedItem` (userId, sourceWorkId, platform, url, canonicalUrl, status, publishedAt)
- `PitchOpportunity` (category, niche, platform type, contact, accept signals, notes)
- `Pitch` (userId, opportunityId, status, angle, sentAt, replyStatus)
- `RankSnapshot` (userId, query, position, url, capturedAt)
- `WatchedQuery` (userId, query, profession-tagged)

Existing tables migrate: `Page/ContentBlock` → hub + works; `NameClaim` stays; `SearchConsoleLink`, `ImportConnector`, `NameMonitoringRule` → profile/footprint rows.

---

## 6. Milestone series

### M0 — Foundations freeze
**Goal:** ratify plan + schema + Stripe products before any build.
- Deliverables: schema deltas approved; Stripe products created ($1 invoice item, $9 promo Price, $29 standard Price); platform OAuth credential inventory; agent tool contract (interface per engine); promo-window flag design; this roadmap marked current.
- Exit: M0 doc committed; no open schema questions.

### M1 — v2 app shell
**Goal:** authenticated app is three pages.
- Deliverables: route map (`/chat`, `/profile`, `/settings`; everything else behind them); chat page shell (message list + composer + approval cards); `/settings` shell (account, billing, permission envelope editor UI); `/profile` shell (hub status, identity-web status); redirect of old dashboards.
- Exit: sign in lands on `/chat`; no dead links for members; old settings feature pages removed from member nav.

### M2 — Resume-in onboarding
**Goal:** resume is the only input; user lands in chat with a plan.
- Deliverables: resume upload (PDF/docx/text, stored on our own uploads infra); AI parsing → Footprint Graph (name, profession, skills, experience, works, links); Discovery quick scan (baseline SERP for name + profession queries); welcome message from the agent with a day-1 plan; $1 deposit + 7-day trial activation inline.
- Exit: new member goes signup → resume → chat-with-plan in < 5 minutes; SERP baseline captured day 1.

### M3 — Agent core
**Goal:** one brain, per-user instances, safe tool use.
- Deliverables: agent runtime (message loop, tool registry, per-user `AgentState`, memory persistence, permission-envelope enforcement, approval queue); model routing (cheap model for routine ops, strong model for drafting/decisions); idempotency + retries on every tool; work-logging on every action.
- Exit: agent completes a scripted mission (study → propose → publish one hub piece) respecting envelope + approvals.

### M4 — Study engine (Listener + Discovery)
**Goal:** the agent knows the user continuously.
- Deliverables: `ListenerService` port of imports (RSS/GitHub/YouTube) + OAuth sync (Medium/X/WordPress); new-work detection → Transform pipeline trigger; Discovery scan (name+profession search, verify via resume links) → **Gap Report** in chat.
- Exit: a user with a blog feed sees new posts detected and gapped within a day.

### M5 — Transform & Publish engine
**Goal:** the agent publishes the user's works across the web, correctly.
- Deliverables: `TransformerService` (per-platform variants: intro/angle/tagging + canonical links, format rules per target); `PublisherService` across API tiers; paste-kit flow for closed platforms in-chat; content quality gate (no thin/duplicate output — enforced).
- Exit: one work → hub + 2 third-party properties, all canonical-correct, in one approval batch.

### M6 — Pitch engine
**Goal:** the agent finds and pitches opportunities on the user's behalf.
- Deliverables: Opportunity Ledger v1 (one profession vertical — start with consultants/execs); matcher (niche + strength + goals); personalized pitch drafting; batch approval in chat; rate-limit hygiene; fulfillment kit on acceptance; reply tracking → angle learning.
- Exit: 50 real opportunities seeded in one vertical; pitch send + reply tracking round-trip works.

### M7 — Rank engine
**Goal:** visible, moving proof.
- Deliverables: `RankService` (SERP snapshots for watched queries, dedup, position history); movement alerts in chat; rank dashboard feed in Profile; **weekly report card** generation.
- Exit: new member sees day-1 baseline and weekly movement lines in-trial (first-win requirement).

### M8 — Billing v2
**Goal:** $1 → 7 days → $9 day-8 auto-convert, end to end.
- Deliverables: $1 invoice flow; trial subscription; auto-convert; promo-window Price switch; cancel-in-trial → refund deposit; dunning + pause; upgrade/downgrade from Settings; webhook idempotency + audit.
- Exit: full billing journey passes e2e incl. day-8 conversion simulation and cancel-in-trial.

### M9 — Chat depth & mobile
**Goal:** chat is a delightful 30-second-burst surface.
- Deliverables: agent conversation polish (onboarding scripts, quick replies, approvals UI, share-sheet/email capture for "a thing I did"), PWA install + push notifications (rank jumps, pitch replies, pending approvals), offline async queue (agent works; user reviews later).
- Exit: mobile-first usability pass on 4G-class connection; approval latency < 1 tap each.

### M10 — Migration & cutover
**Goal:** v1 data and flows move cleanly.
- Deliverables: data migration (claims/pages/blocks/imports/SearchConsole/monitoring → v2 entities); auth pages repointed (`/onboarding` → resume flow → `/chat`); legacy dashboards archived; free-plan references purged codebase-wide; old `/pricing` billing paths closed.
- Exit: seeded v1 demo profiles render in v2 hub; zero legacy routes for members.

### M11 — Integrity & scale
**Goal:** the platform is defensible, not spam.
- Deliverables: per-target rate/ToS compliance in Publisher; transforms quality review process; abuse/impersonation guardrails (only user's own works; no scraped content); observability (agent traces, engine metrics, error tracking); monitoring/alerting on every worker.
- Exit: abuse red-team pass; published-item audit shows 100% canonical-correct, 0 duplicate copies.

### M12 — Proof marketing & launch
**Goal:** premium-only funnel converts on proof.
- Deliverables: case-study surface (with user permission; before/after SERP); public showcase; trial-funnel analytics (resume→pay, day-8 conversion, cancel reasons); pricing page final copy + launch announcement (blog, changelog); promo-window closure playbook.
- Exit: funnel metrics visible; launch content live; go/no-go review.

---

## 7. Cross-cutting requirements

- **Testing:** unit per service; e2e per milestone exit (auth + billing + chat-approval flows); the seven-day first-win path is the top regression suite.
- **Deployment:** unchanged — Docker + Caddy on this box, shared 80/443; worker/cron containers added for engines.
- **Security:** OAuth tokens encrypted at rest; permission envelope enforced server-side (never client-only); agent tool calls audited.
- **Integrity rules from `product-plan-v2.md` §9 apply to every engine.**

## 8. Open decisions

1. Agent model routing (which provider/models) — decide in M3 after cost tests.
2. First pitch vertical for the ledger (M6) — consultants/execs proposed.
3. Promo window length ("launch window") — pricing copy currently says early members; set an end date in M8.
