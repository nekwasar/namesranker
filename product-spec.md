# NamesRanker — Product Specification

**Status:** Approved · **Last updated:** 2026-08-17
**Product:** An SEO-native platform where every professional gets a mini-website on `namesranker.com` engineered to rank #1 for their name on Google, powered by a scarcity-driven name-claim system.

---

## 1. Vision & Value Proposition

### 1.1 The product in one sentence

People get a searchable, SEO-engineered page (or set of pages) under their own name on `namesranker.com` so that when anyone Googles their name, _their_ page — with their picture and their "world" (bio, work, portfolio, links, content) — is the top result.

### 1.2 Why this wins over competitors

- **LinkedIn** ranks but is walled-in, ugly, and users don't own a clean URL slug.
- **Personal websites** require building and maintenance; most people never make one.
- **Linktree** is a single page of links with no indexable content.

NamesRanker is a **full personal mini-website** whose job is owning every Google result related to a person's name — with the SEO done for them.

### 1.3 Who it's for

Anyone who wants to see their name and picture at the top of Google for their name: professionals, freelancers, job seekers, creators, artists, authors, founders. Essentially "every professional."

### 1.4 Core promise / messaging

- "Own the #1 result for your name."
- "Your name is searchable. Make it _yours_."
- Brand tagline: "**Your name, ranked.**" — Ra-nk is the premium identity badge.
- Scarcity framing: "`john-smith` is still available. Claim it before someone else does."
- **Positioning:** a **ranking** platform that owns the top results for a name — where the bio, work, portfolio, and content sections are all engine that fuels the ranking, not the point in themselves. **Bio is included on every page (free and premium)** — it's core content that gives a page real value and makes it rankable. The rank-focused angle is about _messaging/branding_, never about stripping content from the free tier.

---

## 2. The Name & Slug System (core differentiator)

### 2.1 Claim rules

1. User enters their name. System parses word count.
2. **One-word names are always premium.** No workaround. One-word slugs (e.g., `beyonce`, `adele`) are the scarcest, most valuable — only premium users can claim them.
3. **Two-word names (first + last) are free** — the base slug is `first-last`, e.g. `john-smith`.

### 2.2 Slug generation chain

1. Try `first-last` (e.g., `john-smith`).
2. If taken → **keyword variant** using a curated profession keyword list: `john-smith-codes`, `john-smith-designs`.
   - The keyword is chosen by the user from a **curated list** (no free-text), derived from their declared profession.
   - SEO note: "john smith codes" is a _more specific, winnable_ long-tail query — the fallback is better targeting, not a punishment.
3. If both taken → append a number (`john-smith-codes-2`) and/or suggest alternative keywords from the curated list.
4. **Premium custom handle:** if `john-smith` is taken, premium users can choose their own clean variant instead of an auto-keyword.

### 2.3 Name protection & monitoring (premium)

- **Name protection:** your one-word slug stays exclusively yours **while subscribed**. No workaround for non-premium.
- **Name monitoring:** premium users get alerts when anyone claims a slug matching their name.

### 2.4 Expiry / lapse policy (as decided)

- **Monthly premium lapses** → one-word slug **released to the pool immediately.** Email warning sent on lapse.
- **Yearly premium lapses** → **30-day grace period** (`graceUntil`), reminder emails at days 7, 1, and 0, then released.
- Keyword/custom slugs persist with the user; **only the one-word premium claim releases** on lapse.

### 2.5 Data model: `NameClaim`

| Field         | Type        | Notes                                                       |
| ------------- | ----------- | ----------------------------------------------------------- |
| `id`          | UUID        |                                                             |
| `slug`        | string      | unique                                                      |
| `wordCount`   | int         | 1 or 2+                                                     |
| `type`        | enum        | `standard` \| `keyword` \| `one-word` \| `custom`           |
| `claimedById` | FK → `User` |                                                             |
| `status`      | enum        | `claimed` \| `protected` \| `pending-release` \| `released` |
| `keyword`     | string      | the profession keyword, if keyword variant                  |
| `claimedAt`   | datetime    |                                                             |
| `graceUntil`  | datetime    | null unless yearly-lapse grace is active                    |

### 2.6 Curated keyword list

- Seed table `Keyword`: profession → 10–20 keywords per profession.
- Examples: Design → `designs`, `illustrates`, `sketches`, `brands`…; Engineering → `codes`, `builds`, `engineers`…; Writing → `writes`, `authors`, `edits`…
- No free-text input; selection from the curated list only, to keep slugs clean and consistent.

### 2.7 Scarcity engine (growth)

- Landing page and onboarding show live availability: "`john-smith` is still available. Claim it before someone else does."
- If unavailable, show the better-available variant to drive urgency and registration speed.
- Email nudges remind users to finish claiming before a name is taken.

---

## 3. Multiple Pages Per User

Each user gets a **mini-website**, not one page:

```
namesranker.com/john-smith                  ← hub page (the name target)
namesranker.com/john-smith/portfolio        ← supporting page
namesranker.com/john-smith/project-xyz      ← supporting page
namesranker.com/john-smith/blog/...         ← as many as they want
```

- The **hub** targets the person's name; each **sub-page** targets a related keyword ("john smith portfolio", "john smith freelance designer").
- Hub and spokes **interlink** (hub → sub-pages, sub-pages → hub). Classic SEO hub-and-spoke pattern.
- This is what makes the product more than "a portfolio": it's a full personal site engineered to own the results for a name.
- Rule: **one hub page per person** (email = identity). Nobody can squat multiple name-slugs.

### Free vs Premium on pages

- **Free:** 1 hub page only, standard sections, standard design.
- **Premium:** unlimited — hub + unlimited sub-pages, more sections, import auto-sync, custom domain.

---

## 4. Same-Name Conflict Resolution

Real problem, two sub-problems:

1. **Slug collision** (both want `john-smith`):
   - First-come, first-served on the clean slug.
   - Later claimants get a **professional handle** via the curated keyword (`john-smith-designs`, `john-smith-austin`) or a number.
   - Directory shows both with their **descriptor** (profession/location) so they're distinguishable at a glance.
2. **Keyword competition** (two pages target "John Smith" on the domain):
   - Inherent to the real world — two people with the same name exist.
   - Google resolves it naturally: each page optimizes for "name + descriptor" ("john smith illustrator chicago" vs "john smith software engineer"), so they don't compete for the same query.
   - The descriptor is a **first-class part of the title/H1**, never an afterthought.

---

## 5. Content Collection & Onboarding

### 5.1 Collection model

- **Progressive structured onboarding**: collect the minimum to make a rankable page, then keep asking over time via email nudges.
- **Settings/user-data**: everything is editable later; users who skip onboarding finish there.
- **Import connectors** (premium = auto-sync, free = manual): blog RSS (full text = strong SEO), GitHub API (projects), YouTube/Instagram (via official APIs).
  - **Do NOT scrape LinkedIn or other people's sites** — ToS/legal risk and Google devalues scraped duplicate content.
- **Never auto-generate thousands of pages from forms with no human input.** Every page must be genuinely useful to someone searching that person's name (E-E-A-T: real identity, real links, real content).

### 5.2 Onboarding flow (`/onboarding`) — steps

1. Email magic-link sign-in → enter name → **live slug claim** (scarcity copy + one-word paywall).
2. Descriptor (profession/location) + photo + short bio.
3. Links & socials.
4. Experience / projects / works.
5. Publications + testimonials.
6. Import connectors (blog RSS, GitHub, YouTube).
7. **Live page preview** + "your page is live — share it" (shareability = the natural backlink engine).

- Progress indicator throughout; **skip allowed** at any step → unfinished data lives in Settings.
- Every step writes `ContentBlock`s and shows a live page preview so value is visible immediately.

### 5.3 Settings & user-data (`/settings`, `/settings/user-data`)

- Full CRUD on every section (the "finish later" path for skippers).
- Add/manage **sub-pages** under the slug namespace (premium gate).
- Per-page **SEO editor** with Google SERP preview (title/description) + readability.
- Import connector management + manual sync.
- Account, plan/billing, profile photo, GDPR export/delete.

---

## 6. SEO Machinery (the moat)

- **JSON-LD structured data**: `Person`, `ProfilePage`, `Organization`.
- **sitemap.xml + robots.txt**, canonical URLs, OG tags.
- **ISR** (incremental static regeneration) on all public pages for speed + freshness.
- **Hub-and-spoke internal linking** across every user's pages and the directory.
- **Fast Core Web Vitals** (the base design constraint for every page).
- **Per-page Search Console access** (premium, OAuth) — users see their name's queries, impressions, and position.
- **"Official page" badge** for users to put on LinkedIn, business cards, GitHub — produces **organic backlinks**.
- **Curated keyword slugs** double as long-tail keyword targeting.

### The Ra-nk premium domain (vanity URLs + curated showcase)

- Brand: **Ra-nk** — premium identity badge for the platform ("your name, ranked"). Not a bio product; it's a ranking brand.
- Domains: **`ra-nk.me` (primary)** + **`ra-nk.co` (brand/protective redirect → `ra-nk.me`)**. Both verified available (`.me` independently; `.co` per registrar check).
- **Option A — vanity URLs (premium):** `{name}.ra-nk.me` → **301 redirect** to the user's canonical page at `namesranker.com/{slug}`. Business-card links, NOT indexed sites — all authority stays on `namesranker.com` (canonical = namesranker). Optional premium add-on, not a default.
- **Option B — curated showcase:** `ra-nk.me/{name}` featured placements on the premium domain, **gated to content-active users only** (not all premium subscribers). Human-reviewed curation, never auto-generated — builds the second domain as a quality property and gives active users more indexed results for their name.
- Deploy note: implemented behind a single `BASE_DOMAIN` config so the premium base URL can be swapped in cleanly once the domains are registered.

### The backlink reality (hard constraint)

- **Never programmatically build backlinks at scale** — Google's spam systems (SpamBrain, Penguin) are trained to detect this and can kill the whole domain, which kills every user's page.
- The sustainable link engine is **earned**: users naturally link their page from their own footprint (LinkedIn, email signature, business card, GitHub bio), plus genuine editorial links to the platform itself.
- No "pay to rank" black-hat promises — ever.

---

## 7. Public Routes

| Route                | Purpose                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                  | **Landing — the hunger machine.** Hero ("Own the #1 result for your name"), live scarcity proof, 3-step how-it-works, sample profiles, pricing, CTA → onboarding |
| `/names`             | Public searchable directory — search + profession/location filters; descriptors disambiguate same-name users                                                     |
| `/[slug]`            | Public hub page, ISR + JSON-LD                                                                                                                                   |
| `/[slug]/[...sub]`   | Public sub-pages (portfolio, projects, blog…)                                                                                                                    |
| `/pricing`           | Plans & pricing                                                                                                                                                  |
| `/login`             | Email entry → magic link                                                                                                                                         |
| `/magic-link/verify` | Magic-link verification landing                                                                                                                                  |

## 8. Authenticated Routes

| Route                 | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `/onboarding`         | Multi-step wizard (see §5.2)                                     |
| `/settings`           | Account, plan/billing, preferences                               |
| `/settings/user-data` | All user content: sections, sub-pages, SEO editor, imports       |
| `/admin`              | Approvals, name-dispute resolution, spam review, claim overrides |

---

## 9. Authentication

- **Email + magic link only** (Auth.js).
- Flow: enter email → Brevo sends magic link → click to sign in → new users go to `/onboarding`, returning users to `/settings`.
- One identity per email; email is the basis for the "one hub page per person" rule.

---

## 10. Monetization

### 10.1 Plans: Free + Premium (one premium plan)

| Billing period | Price               |
| -------------- | ------------------- |
| Monthly        | $30/month           |
| Annual         | $299/year (~$25/mo) |
| Lifetime       | $1,399              |

### 10.2 Feature gates

| Feature                                            | Free   | Premium                       |
| -------------------------------------------------- | ------ | ----------------------------- |
| Two-word slug (`first-last`)                       | ✓      | ✓                             |
| Keyword fallback (`first-last-codes`)              | ✓      | ✓                             |
| One-word name claim                                | ✗      | ✓                             |
| Name protection (one-word, while subscribed)       | ✗      | ✓                             |
| Name monitoring                                    | ✗      | ✓                             |
| Custom handle if slug taken                        | ✗      | ✓                             |
| Hub page                                           | 1      | ✓                             |
| Extra sub-pages                                    | ✗      | Unlimited                     |
| Import connectors                                  | Manual | Auto-sync                     |
| Custom domain                                      | ✗      | ✓                             |
| Ra-nk vanity URL (`{name}.ra-nk.me`, 301 redirect) | ✗      | ✓                             |
| Ra-nk showcase placement (`ra-nk.me/{name}`)       | ✗      | ✓ (content-active users only) |
| Deep SEO / Search Console per page                 | Basic  | ✓                             |
| Badge removed                                      | ✗      | ✓                             |

### 10.3 Billing notes

- Stripe for billing; webhook-driven entitlement changes.
- Lapse logic (see §2.4): monthly = immediate release; yearly = 30-day grace.
- Lifetime = one-time, perpetual premium.

---

## 11. Administration

- **Approvals**: review/approve/reject new pages.
- **Name disputes**: resolve same-name claims and disputes.
- **Imports**: review connector content for spam.
- **Claims**: manually release, reclaim, or override slugs.
- **Showcase curation**: review/approve `ra-nk.me` featured placements (content-active users only).

---

## 12. Technical Stack

- **Next.js (App Router, TypeScript)** — SSR/SSG/ISR; SEO-native public pages.
- **Postgres + Prisma** — dev: local Docker; prod: Neon/Supabase.
- **Auth.js (NextAuth)** — email + magic-link provider.
- **Brevo** — transactional email: magic links, expiry warnings, monitoring alerts, onboarding nudges.
- **Stripe** — billing + entitlements.
- **Vercel Blob** — portfolio images/files.
- **Deploy:** Vercel + `namesranker.com` (main platform) + `ra-nk.me` / `ra-nk.co` (premium brand, §6).

### 12.1 Core data model

- `User` — email, plan (free/premium), onboarding progress, preferences.
- `NameClaim` — the core slug-ownership table (see §2.5).
- `Page` — ownerId, hub flag, slug, title, metaTitle, metaDescription, descriptor, status, premium flags.
- `ContentBlock` — per page: type (bio, experience, project, testimonial, social, publication, custom), JSON payload, ordering.
- `ImportConnector` — RSS/GitHub/YouTube, external URL, lastSyncedAt.
- `Keyword` — curated profession→keywords seed table (10–20 per profession).
- `SearchConsoleLink` — per page (premium).

---

## 13. Build Order

1. Project scaffold + DB schema + magic-link auth (Brevo).
2. Landing page + auth routing.
3. Public page rendering + SEO (schema, sitemap, ISR).
4. **Name-claim engine** + curated keyword seed data.
5. Onboarding wizard.
6. Settings/user-data + sub-page management.
7. Import connectors.
8. Directory `/names` + same-name resolution.
9. Admin panel.
10. Stripe + premium gating + expiry/grace logic.
11. Search Console integration.
12. Ra-nk premium domain (buy + configure `ra-nk.me`/`ra-nk.co`, vanity 301s, curated showcase).

---

## 14. Non-Negotiables / Guardrails

1. Subdirectories only on `namesranker.com` — **never per-user indexed subdomains** (authority compounding on one domain is the whole model). Exception: premium vanity links (`{name}.ra-nk.me`) are **301 redirects only**, never indexed, so they don't split authority.
2. One hub page per person (email = identity).
3. One-word names are always premium, no workaround.
4. No automated backlink schemes, ever.
5. Every user page must be genuinely useful (no thin/auto-generated content).
6. No scraping of LinkedIn or third-party sites.
7. Curated keyword list only for slug disambiguation (no free-text slugs).
