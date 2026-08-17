# NamesRanker — Technical Plan & Milestones

**Repository:** `o4ainnovations/namesranker`
**Status:** Approved · **Last updated:** 2026-08-17
**Product reference:** see `product-spec.md` for the full product spec. This document is the engineering companion.

---

## 1. Stack & Architecture

### 1.1 Tech stack
| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) on Vercel |
| Rendering | SSR/ISR for public pages; RSC + Server Actions for writes |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Full-text search | Postgres `pg_trgm` (fuzzy name search) |
| Cache / rate-limit / queues | Redis via Upstash |
| Object storage | Vercel Blob (images, files) |
| Auth | Auth.js (NextAuth) custom email/magic-link provider |
| Transactional email | Brevo (magic links, alerts, nudges, expiry) |
| Billing | Stripe (monthly $30 / annual $299 / lifetime $1,399) |
| Cron | Free external (cron-job.org → protected serverless endpoints) |
| Error tracking | Sentry |
| Analytics | Vercel Analytics + GA4 events |
| Testing | Vitest (unit) + Playwright (e2e, full enterprise suite) |

### 1.2 Domains
- `namesranker.com` — main platform (subdirectory architecture, authority compounding).
- `ra-nk.me` — premium brand, primary (vanity URLs + curated showcase).
- `ra-nk.co` — brand/protective redirect → `ra-nk.me`.
- Implemented behind a single `BASE_DOMAIN` config for clean swap.

### 1.3 Architectural rules (non-negotiable)
1. Subdirectories only on `namesranker.com` — never per-user *indexed* subdomains (authority compounding on one domain is the whole model). Exception: premium vanity links (`{name}.ra-nk.me`) are **301 redirects only**, never indexed.
2. One hub page per person (email = identity).
3. One-word names are always premium, no workaround.
4. No automated backlink schemes, ever.
5. Every user page must be genuinely useful (no thin/auto-generated content).
6. No scraping of LinkedIn or third-party sites.
7. Curated keyword list only for slug disambiguation (no free-text slugs).

### 1.4 Environment variables
```
DATABASE_URL
BLOB_READ_WRITE_TOKEN
NEXTAUTH_SECRET
NEXTAUTH_URL
BREVO_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
BASE_DOMAIN
RA_NK_DOMAIN
REDIS_URL (Upstash)
GITHUB_TOKEN (imports, read-only)
YOUTUBE_API_KEY
GOOGLE_SEARCH_CONSOLE_CLIENT_ID / _SECRET
CRON_JOB_SECRET (protects external cron endpoints)
```

---

## 2. Data Model (Prisma)

### 2.1 `User`
| field | type | notes |
|---|---|---|
| id | cuid | |
| email | string unique | identity = one hub page per person |
| plan | enum `FREE`/`PREMIUM` | entitlement source of truth |
| stripeCustomerId | string? | |
| stripeSubscriptionId | string? | |
| onboardedAt | datetime? | |
| onboardingStep | int? | resume wizard |
| profilePhotoUrl | string? | Vercel Blob URL |

### 2.2 `NameClaim` — the slug-ownership table
| field | type | notes |
|---|---|---|
| slug | string unique | `john-smith`, `beyonce`, `john-smith-codes` |
| wordCount | int | 1 or 2+ |
| type | enum `STANDARD`/`KEYWORD`/`ONE_WORD`/`CUSTOM` | |
| status | enum `CLAIMED`/`PROTECTED`/`PENDING_RELEASE`/`RELEASED` | |
| claimedById | FK User | |
| keyword | string? | curated keyword if KEYWORD type |
| claimedAt | datetime | |
| graceUntil | datetime? | set on yearly-lapse grace |

### 2.3 `Page` — hub + sub-pages
| field | type | notes |
|---|---|---|
| ownerId | FK User | |
| isHub | bool | one per user |
| path | string unique | `john-smith` or `john-smith/portfolio` |
| title | string | |
| metaTitle | string? | SEO editor |
| metaDescription | string? | SEO editor |
| descriptor | string | profession+location; drives disambiguation |
| status | enum `DRAFT`/`PENDING`/`LIVE`/`REJECTED` | admin-approved |
| seoScore | int? | computed |
| customDomain | string? | premium |
| publishedAt | datetime? | |

### 2.4 `ContentBlock`
| field | type | notes |
|---|---|---|
| pageId | FK Page | |
| type | enum `BIO`/`PHOTO`/`EXPERIENCE`/`PROJECT`/`TESTIMONIAL`/`SOCIAL`/`PUBLICATION`/`CUSTOM` | |
| payload | Json | per-type shape |
| order | int | |

### 2.5 Supporting tables
- `ImportConnector` — pageId, type (`RSS`/`GITHUB`/`YOUTUBE`), externalUrl, autoSync (premium), lastSyncedAt.
- `ImportedContent` — connectorId, title, url, content (RSS full text = SEO gold), publishedAt.
- `Keyword` — seed table: profession → 10–20 curated keywords.
- `NameMonitoringRule` — userId, nameToMonitor, lastAlertAt (premium).
- `SearchConsoleLink` — pageId, propertyUrl, encrypted OAuth refresh token, lastImportAt (premium).
- `ShowcaseEntry` — pageId, domain, path, status (`PENDING`/`LIVE`/`REJECTED`), approvedById (Ra-nk curation).
- `AuditLog` — actorId, action, entityType/id, metadata (admin).
- `MagicLinkToken` — tokenHash, email, expiresAt (15 min), usedAt (single-use).

---

## 3. Feature Details

### 3.1 Auth — magic link only
- `POST /api/auth/magic-link`: validate email → create `MagicLinkToken` (store hash) → Brevo email with one-click URL.
- `GET /api/auth/verify?token=...`: single-use, 15-min expiry → session → redirect new users to `/onboarding`, returning to `/settings`.
- Rate limit per email/IP via Redis (e.g., 3/min).

### 3.2 Landing page (`/`)
- Hero ("Own the #1 result for your name"), live scarcity strip (real availability via ISR), 3-step how-it-works, sample profiles (2 demo profiles), pricing, testimonials, CTA → `/onboarding`.
- Lighthouse ≥90 performance/SEO on `/`.

### 3.3 Onboarding wizard (`/onboarding`) — 7 steps, resumable
1. Name claim (the engine, §3.5) — one-word → premium paywall.
2. Descriptor + photo + short bio.
3. Links & socials.
4. Experience / projects.
5. Publications + testimonials.
6. Import connectors (RSS/GitHub/YouTube).
7. Live preview + "share your page" (badge, share links → natural backlinks).

Each step writes `ContentBlock`s; live preview rendered alongside; Skip at any point → `/settings/user-data` holds unfinished data; email nudge after 24h.

### 3.4 Name-claim engine
- Normalize input (trim, case, unicode) → word count.
- **1 word** → premium gate. **2+ words** → free.
- Slug chain: `first-last` → `first-last-<keyword>` (curated list by profession) → `first-last-<keyword>-2` / alt keywords.
- **Race safety:** claim inside transaction + unique constraint; on `P2002` conflict retry next variant. No double-claims.
- Scarcity copy + "who claimed it recently" feed.
- Premium extras: custom handle, one-word claim, name protection (`PROTECTED` while subscribed), name monitoring.

### 3.5 Public pages (`/[path]`, `/[path]/[...sub]`)
- `generateStaticParams` over LIVE pages + ISR `revalidate: 3600`.
- JSON-LD `Person`/`ProfilePage`, OG, canonical, meta.
- Hub = descriptor-rich H1; sub-pages interlink (hub-and-spoke).
- `sitemap.xml` + `robots.txt`.

### 3.6 Directory (`/names`)
- `pg_trgm` fuzzy search + profession/location filters + pagination.
- Same-name resolution: descriptor display; disambiguated slugs shown; canonical care so variants don't compete.

### 3.7 Settings & user-data (`/settings`, `/settings/user-data`)
- Full `ContentBlock` CRUD + reorder; sub-page manager (premium gate).
- SEO editor: metaTitle/metaDescription with live Google SERP preview + `seoScore`.
- Import connector management + manual sync (premium: cron auto-sync).
- Account, plan/billing, photo, GDPR export/delete (JSON export; delete cascades).

### 3.8 Import connectors
- RSS: fetch + parse (rss-parser), store full text. GitHub: authenticated API pull of repos. YouTube: API pull of latest uploads.
- Free = manual sync; premium = auto-sync via external cron. Rate limits respected; failures logged + surfaced.

### 3.9 Admin (`/admin`)
- Page approvals (DRAFT→PENDING→LIVE), name disputes, import reviews (spam), claim overrides, showcase curation, audit log viewer.

### 3.10 Billing (Stripe)
- `/pricing` + checkout (monthly $30 / annual $299 / lifetime $1,399).
- Webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Lapse logic: monthly → one-word slug released immediately + warning email; yearly → `graceUntil = now+30d`, emails at days 7/1/0, release at 0; lifetime → perpetual.
- Entitlement helper `isPremium(user)` used across all gating.

### 3.11 Transactional email (Brevo)
Magic link · welcome · onboarding nudges · claim confirmations · monitoring alerts · expiry warnings (7/1/0) · premium upsell. Tagged for tracking.

### 3.12 Ra-nk premium domain
- Option A vanity: wildcard DNS on `ra-nk.me` → edge/middleware → **301** to `namesranker.com/{slug}` (never indexed). Premium only.
- Option B showcase: `ra-nk.me/{name}` curated pages, admin-approved, gated to content-active users. Human-reviewed, never auto-generated.
- `BASE_DOMAIN` config swap.

### 3.13 External cron (free — cron-job.org)
Protected endpoints (shared `CRON_JOB_SECRET`):
- Import auto-sync (premium connectors).
- Name monitoring scans → alerts.
- Lapse sweeps (grace countdown → release).
- ISR revalidation sweeps.

---

## 4. Testing Strategy (enterprise standard, full scale)

### 4.1 Unit (Vitest)
- Slug engine: normalization, word-count, chain, edge cases (unicode, multi-word).
- Lapse logic: monthly/yearly/lifetime; grace countdown.
- Entitlement: `isPremium` across all plan states.
- Race handling: P2002 retry paths.
- SEO: meta/JSON-LD generation.

### 4.2 Integration
- Prisma CRUD + migrations; Redis rate-limit behavior; connector parsing fixtures (RSS/GitHub/YouTube).
- Stripe webhook handlers (test-mode fixtures).

### 4.3 E2E (Playwright, full enterprise suite)
Critical flows, run against a dedicated test database + seeded demo data:
- Magic link sign-in (valid / expired / reused token).
- Full onboarding wizard → page LIVE → shared; skip → data lands in Settings; resume.
- Two users claiming the same name → distinct slugs.
- SEO editor round-trip to public page via ISR revalidation.
- Directory search + filters + pagination.
- Admin approval lifecycle + audit log.
- Checkout → entitlement; monthly cancel releases slug immediately; yearly grace countdown.
- Vanity 301s (curl-level assertions: 301 + canonical intact).
- GDPR export + delete cascade.

### 4.4 Performance
- Directory with seeded rows: search <200ms.
- Public pages: Core Web Vitals green (LCP <2.5s).
- Load sanity: 1k concurrent name-claims no double-assignment (scripted).

### 4.5 Security
- Magic-link token hashing; OAuth refresh tokens encrypted at rest.
- Rate limiting on auth/claims/sync/admin.
- Secrets only via env; never logged.

### 4.6 CI
- Lint + `tsc` + unit + e2e on every PR (GitHub Actions).

---

## 5. Milestones

**Convention:** *deliverable* + *acceptance criteria* + *estimated effort*.

### Phase 1 — Foundations (M0–M1)

#### M0 — Project scaffold + infrastructure
- Next.js 14 (App Router, TS), ESLint, Prettier, Prisma, Docker Postgres, Vitest + Playwright, Sentry.
- Env structure, secrets, Vercel project, Neon DB, Upstash Redis.
- **Done when:** app boots locally + deploy preview renders; `tsc` + lint pass.

#### M1 — Data model + magic-link auth (Brevo)
- Full Prisma schema (§2), migrations, seed (Keyword samples).
- Auth.js custom email provider: `POST /api/auth/magic-link`, `GET /api/auth/verify`, session, Redis rate limits.
- Brevo sender verified + template.
- **Done when:** e2e sign-in flow passes; wrong/expired/reused tokens rejected.

### Phase 2 — Core value visible (M2–M4)

#### M2 — Landing page (`/`)
- Hero, scarcity strip (live availability), 3-step how-it-works, **2 demo profiles**, pricing, CTA.
- **Done when:** Lighthouse ≥90 performance/SEO; CTAs route to `/onboarding`.

#### M3 — Public pages + SEO engine
- `/[path]` + `/[path]/[...sub]`; `generateStaticParams` + ISR (3600s).
- JSON-LD, OG, canonical, meta; `sitemap.xml`, `robots.txt`.
- **Done when:** demo page renders; structured-data test clean; sitemap lists it.

#### M4 — Name-claim engine
- Normalization → word count → slug chain; transaction + unique-constraint race safety.
- One-word premium paywall stub; curated keyword selection; scarcity copy; confirmation email.
- **Done when:** unit tests cover slug chain + races; e2e two-user same-name → distinct slugs.

### Phase 3 — The user product (M5–M7)

#### M5 — Onboarding wizard
- 7 steps, resumable, skip-anywhere, live preview, progress, 24h nudge email.
- **Done when:** full wizard e2e; skip → Settings; resume at correct step.

#### M6 — Settings & user-data
- `ContentBlock` CRUD + reorder; sub-page manager (premium-gated); SEO editor (SERP preview + `seoScore`); GDPR export/delete.
- **Done when:** edit round-trips to public page via ISR revalidation; delete cascades.

#### M7 — Import connectors
- RSS (full-text), GitHub, YouTube; manual sync + status/errors.
- **Done when:** real feeds render as sections; failures logged + surfaced.

### Phase 4 — Discovery & control (M8–M9)

#### M8 — Directory (`/names`)
- `pg_trgm` search + filters + pagination; descriptor disambiguation; canonical care.
- **Done when:** search "smith" returns Johns with descriptors; seeded rows paginate <200ms.

#### M9 — Admin (`/admin`)
- Approve/reject pages, name disputes, import reviews, claim overrides, audit log.
- **Done when:** full moderation lifecycle tested; actions write AuditLog.

### Phase 5 — Revenue (M10)

#### M10 — Billing, gating & lapse
- Stripe checkout (30/299/1399), webhooks, `isPremium`.
- Gating everywhere (one-word, sub-pages, custom handle, monitoring, auto-sync, deep SEO, vanity, badge).
- Lapse logic (monthly immediate; yearly 30-day grace; lifetime perpetual).
- **Done when:** checkout→entitlement live; monthly cancel releases immediately; yearly grace releases at 0.

### Phase 6 — Premium depth (M11–M12)

#### M11 — Search Console (premium)
- Google OAuth per page → `SearchConsoleLink` (encrypted refresh token); queries/impressions/position dashboard.
- **Done when:** OAuth flow works; real query data renders per page.

#### M12 — Ra-nk domain
- Buy/configure `ra-nk.me` (+`ra-nk.co` redirect); wildcard DNS → edge middleware.
- Option A vanity 301s; Option B curated showcase (admin-approved, content-active gating).
- External cron wired: import auto-sync + monitoring + lapse sweeps.
- **Done when:** vanity 301s verified (curl: 301 + canonical intact); showcase live; cron runs verified.

---

## 6. Milestone dependency graph

```
M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7
                    ↘          ↘
              (M4 gates)  M8 → M9 → M10 → M11 → M12
```

**Parallelizable:** M8 after M4; M7 after M5.

---

## 7. Demo / seed data
- **Exactly 2 demo profiles** (per decision) for landing samples + testing — realistic, fully populated hub pages.
- Keyword seed: curated profession→keywords (10–20 per profession) across ~10 professions.
- Any bulk performance seeding (directory, claims) is test-only data, never shown publicly.

---

## 8. Open items at execution time
- Confirm Stripe test-mode keys before M10 (go-live key swap later).
- Google Search Console OAuth client setup before M11.
- `ra-nk.me`/`ra-nk.co` registration before M12.
