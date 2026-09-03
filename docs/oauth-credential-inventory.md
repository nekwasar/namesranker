# v2 Platform OAuth credential inventory (M0)

Ratified in M0 (milestones-v2.md). This is the inventory of third-party
credentials the engines will need — what each platform tier requires, the env
key it lives in, and whether it is currently provisioned. **Secrets never
belong in this file or in git** — only key names and provisioning status.

Tier reference: product-plan-v2.md §2.3 (Full API / Limited / Closed).

## Tier legend

| Tier      | Meaning                                                                       |
| --------- | ----------------------------------------------------------------------------- |
| Full API  | True OAuth — the agent reads, transforms and publishes automatically          |
| Limited   | API throttled — the agent does most; user confirms on cadence                 |
| Closed    | No agent posting — agent prepares a paste-kit the user applies (~30s in chat) |
| Discovery | No auth needed — public read / search only (footprint scans, SERP tracking)   |

## Inventory

| Platform                           | Tier     | What we need                                                                 | Env key                                                                                                             | Status                                                          |
| ---------------------------------- | -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| GitHub                             | Full API | OAuth app (client id + secret) + fine-grained scopes (repo/content, profile) | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (v1 token: `GITHUB_TOKEN`)                                               | ⏳ not provisioned (v1 read token exists)                       |
| YouTube                            | Full API | OAuth (youtube.upload, read channel)                                         | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_API_KEY` (v1 read key exists)                                | ⏳ not provisioned                                              |
| Google (Search Console / Business) | Full API | OAuth web client (searchconsole, businessprofile scopes)                     | `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`, `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET`                                            | ⏳ not provisioned                                              |
| WordPress / Ghost                  | Full API | Per-user Application Password / Ghost Admin API key (user-held)              | dynamic (per user, encrypted at rest)                                                                               | —                                                               |
| Dev.to                             | Full API | Per-user API key (user-held, configurable scope)                             | dynamic (per user)                                                                                                  | —                                                               |
| Medium                             | Limited  | Per-user integration token (user-held)                                       | dynamic (per user)                                                                                                  | —                                                               |
| X (Twitter)                        | Limited  | OAuth 1.0a / 2.0 app + user tokens                                           | `X_CLIENT_ID`, `X_CLIENT_SECRET`                                                                                    | ⏳ not provisioned                                              |
| Reddit                             | Limited  | OAuth app (script/web) + user auth                                           | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`                                                                          | ⏳ not provisioned                                              |
| LinkedIn                           | Closed   | OAuth read (profile) — posting stays paste-kit                               | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`                                                                      | ⏳ not provisioned                                              |
| Instagram / TikTok                 | Closed   | n/a (paste-kit)                                                              | —                                                                                                                   | —                                                               |
| Brevo (email)                      | —        | Transactional email for the app itself                                       | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`                                                          | ✅ provisioned                                                  |
| Stripe                             | —        | Billing v2 (M8)                                                              | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_DEPOSIT`, `STRIPE_PRICE_PROMO`, `STRIPE_PRICE_STANDARD` | ⏳ keys not set; prices via `scripts/create-stripe-products.ts` |

## Encryption & storage rule (milestones-v2.md §7)

OAuth tokens are stored **encrypted at rest** — the DB keeps a token _ref_,
never plaintext (`SyncedProfile.oauthRef`, `SearchConsoleLink.oauthRefreshToken`
is the v1 predecessor to migrate in M10). All platform posting runs under the
user's own authorization; we never hold platform passwords.

## Owner-side checklist (who provisions what)

- **Us (ops):** GitHub/Google/X/Reddit/LinkedIn app credentials → env.
- **User (in-product, M4+):** Medium token, Dev.to key, WordPress/Ghost
  credentials — entered by the user, exchanged for our token ref.
- **Never:** automated account creation on third-party platforms (product-plan
  v2 §9 — it is banned everywhere and would burn the platform).
