/**
 * Blog content (public marketing hub). Static, typed content today — swap the
 * `posts` source for a CMS later without touching the UI or routes.
 */

export const BLOG_CATEGORIES = [
  "Engineering",
  "Community",
  "Company News",
  "Customers",
  "v0",
  "Security",
  "Changelog",
  "Press",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export interface BlogAuthor {
  name: string;
  role?: string;
  avatarUrl?: string;
}

/** A body block: paragraph, heading, or bulleted list. */
export type BlogBlock = string | { h: string } | { ul: string[] };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  authors: BlogAuthor[];
  /** Body blocks: strings are paragraphs, `{ h }` headings, `{ ul }` lists. */
  body: BlogBlock[];
  /** Pinned as the hero card on the blog index. */
  featured?: boolean;
  /** Marked as a complete article (suppresses the preview sign-off). */
  full?: boolean;
}

const avatar = (img: number) => `https://i.pravatar.cc/96?img=${img}`;

export const blogPosts: BlogPost[] = [
  {
    slug: "meet-your-personal-ranking-agent",
    title: "Meet your personal ranking agent",
    excerpt:
      "NamesRanker is now an engine, not a page-builder. Upload your resume and your personal agent studies you, publishes your works, pitches you, and tracks your name on Google — until you own the #1 result.",
    category: "Company News",
    date: "2026-09-02",
    authors: [{ name: "NamesRanker Team" }],
    full: true,
    body: [
      "Most 'rank your name' products are really link-page builders with an SEO checkbox. You do the work — filling forms, updating profiles, chasing backlinks — and the platform collects a fee. We've decided that's the wrong job description, so we're changing what NamesRanker is.",
      "From today, NamesRanker is a premium-only ranking engine, and every member gets a personal agent that does the work. You approve; it operates.",
      { h: "One resume in, a full operation out" },
      "The whole onboarding is: sign up, verify your email, upload your resume. That's it. Your agent reads the resume and builds your footprint from it — who you are, what you've done, what you've published, and the queries people actually search to find you.",
      "Overnight it captures your baseline: what Google currently shows for your name. Then it comes back to chat with a plan — quick wins first, then the platforms and pitches that matter for your profession. You approve the plan like you'd brief a hire, and the agent gets to work.",
      { h: "What the agent actually does" },
      {
        ul: [
          "Studies you continuously — your blog, your GitHub, your talks — so it always knows your latest work.",
          "Publishes that work across the platforms that matter for your profession, transformed per platform and never duplicated, with canonical links back to you.",
          "Pitches you to podcasts, guest-post spots, directories, and journalists — personalized pitches drafted from your real record.",
          "Tracks your rank on Google for the queries people search to find you, with movement alerts as you climb.",
          "Reports back weekly — a report card in your chat, so you see the line move without babysitting anything.",
        ],
      },
      "Every consequential action needs your approval in chat — a batch of drafts, a round of pitches. Ten minutes a week is the whole job.",
      { h: "Why we moved to one plan, premium-only" },
      "An engine that studies, publishes, pitches, and tracks can't be honestly delivered for free — and a free tier that quietly does nothing is worse than no free tier at all. So there is no free tier. There's one plan, and a $1 trial that unlocks seven full days of everything, so you can watch the engine work on your own name before paying the real rate.",
      "Your name is the one search result you'll never stop caring about. We built an agent that treats it that way.",
    ],
  },
  {
    slug: "one-dollar-seven-days-then-nine",
    title: "The $1 trial: seven full days, then $9/month — exactly how it works",
    excerpt:
      "No hidden limits, no upgrade maze. $1 unlocks everything for a week, and on day 8 your membership auto-converts to $9/month launch pricing. Here's the fine print, in plain English.",
    category: "Company News",
    date: "2026-09-03",
    authors: [{ name: "NamesRanker Team" }],
    full: true,
    body: [
      "Pricing pages hide more than they reveal, so here is our entire pricing policy in plain English — before you pay a dollar.",
      { h: "The whole offer" },
      "One plan. Every feature. No tiers, no limits, nothing held back for a 'higher' plan, because there is no higher plan.",
      {
        ul: [
          "$1 unlocks seven full days — your personal agent running at full power from the first minute.",
          "On day 8, your membership auto-converts to $9/month — our launch rate for early members.",
          "The standard rate is $29/month, and it only applies to people who join after the launch window closes.",
          "Cancel during the seven days and you're never charged the monthly rate — your $1 is refunded.",
        ],
      },
      { h: "Why $1 instead of free" },
      "A $0 trial fills with people who never intended to stay — and an engine like ours can't prove itself to someone who never lets it start. The $1 is a filter, not a fee: it collects a card so day-8 conversion is automatic, and it makes sure everyone in the trial is genuinely curious about ranking their name. If you're not sure, seven days of full power costs less than a coffee.",
      { h: "Why day 8 is automatic" },
      "Ranking a name takes weeks of continuous work, not a burst. If the engine had to stop and ask 'do you want to continue?' at day 8, the momentum dies just as the first results arrive. So the conversion is automatic — and canceling is equally automatic: one tap in Settings, and if you do it during the trial you owe nothing beyond the refunded dollar.",
      { h: "What your seven days should look like" },
      "Day 1: your agent captures your baseline rank and brings you a plan. Days 2–4: your page is live, your best works are being published across your platforms. Days 5–7: your first pitches go out and your rank line starts moving. If by day 7 you can't see the machine working on your own name, cancel — you'll have lost a dollar, not a subscription.",
      "That's the entire policy. One plan, one honest trial, and a launch rate for the people who help us prove the engine works.",
    ],
  },
  {
    slug: "why-were-premium-only",
    title: "Why NamesRanker is premium-only (and proud of it)",
    excerpt:
      "A free tier would quietly fail the very people it's meant to help. Here's why we'd rather charge a fair price and run an engine that actually ranks your name.",
    category: "Company News",
    date: "2026-09-04",
    authors: [{ name: "NamesRanker Team" }],
    full: true,
    body: [
      "The question we get most isn't 'how does it work?' — it's 'why isn't any of it free?' Fair question. Most of the web is free, and name pages used to be our free product too. Here's the honest answer, and why we changed it.",
      { h: "Ranking a name is a machine, not a page" },
      "A page is cheap to serve. An engine is not. To actually move your name on Google, someone has to study you continuously, transform and publish your works, pitch you to third parties, and track your results — every week, for months. That machine runs whether or not you're looking, and it has real costs: infrastructure, platform integrations, outreach, and the care that keeps it from ever becoming spam.",
      "A free tier can't honestly run that machine. It either degrades the service until it stops working, or it finds sneaky ways to monetize the free users — and we decided we'd rather not do either.",
      { h: "Free tiers quietly fail the people they attract" },
      "The cruelest version of freemium is the one that looks generous: a free product that does just enough to attract people who need the real thing, then nudges them into a maze of upgrade screens. That's not generosity — it's a bait-and-switch with extra steps. We'd rather be honest on page one: this is a paid service, it costs a fair price, and here's a trial that lets you verify it works on your own name before you commit.",
      { h: "The people who need this already know what it's worth" },
      "If you've ever searched your own name and found a stranger's profile, an outdated directory, or a decade-old social account answering for you, you know exactly what it's worth to fix that. Our members aren't being upsold into caring about their name — they arrived caring. The product respects that by being direct about what it costs and what it does.",
      { h: "What we promise instead of free" },
      {
        ul: [
          "A $1 trial with seven full days of everything — not a crippled preview.",
          "One plan with every feature in it — no tier ladders, no 'contact sales'. ",
          "Launch pricing at $9/month for early members (standard $29/month after the launch window).",
          "A weekly report card so you always know what the engine did and what it's doing next.",
          "Cancel anytime — your data, page, and published work stay yours.",
        ],
      },
      "We built the machine we'd want working on our own names. It's not free, and that's the point — it's worth paying for because it actually runs.",
    ],
  },
  {
    slug: "your-name-is-a-search-query",
    title: "Your name is a search query. Your metadata is the answer.",
    excerpt:
      "The #1 result for your name isn't decided by luck — it's decided by metadata. Here's the exact on-page checklist that puts your page first.",
    category: "v0",
    date: "2026-09-01",
    authors: [
      { name: "Priya Anand", role: "Head of SEO", avatarUrl: avatar(9) },
      { name: "Mara Voss", role: "Engineering Lead", avatarUrl: avatar(5) },
    ],
    featured: true,
    full: true,
    body: [
      "Google your own name right now. Look at the first page. Chances are the top result isn't you — it's a directory, a social profile, or someone else who shares your name. Every click that page earns is a first impression you never got to make.",
      "Here's the part most people miss: the ranking isn't decided by luck or by who has the biggest social following. It's decided by a handful of on-page signals — and the single most important one is metadata.",
      { h: "Your name is the highest-intent keyword you'll ever own" },
      "People search for you at the exact moment they're about to hire, buy from, or vouch for you. That's not just a vanity query — it's purchase-intent search with your name as the query. And an exact-match page — your name in the title, the H1, the URL — is the strongest relevance signal Google has for that query.",
      "An exact-match name page starts with an enormous advantage. The work is making sure Google trusts that page enough to rank it first. That's where metadata comes in.",
      { h: "Metadata is where rankings are won" },
      "Search engines read your page in a specific order: the title tag first, then the meta description, then the structured data. Get those three right and you've told Google what the page is, who it's for, and why it should rank — before a single word of body copy is considered.",
      {
        ul: [
          "Title tag: your name, exact match, under ~60 characters. No brand suffix diluting it.",
          "Meta description: a sentence that makes the click inevitable — what you do and who you help.",
          "One H1, and only one: your name. Headings are an outline, not a decoration.",
          "Person JSON-LD structured data: Google understands the page is about a real person — with name, job title, and social profiles attached.",
          "Canonical URL: the page must point at itself, so it never competes with a stray copy.",
        ],
      },
      "That checklist is exactly what a NamesRanker page ships with. Clean semantic markup, structured data, and a canonical that never fights itself — so Google gets the full picture in milliseconds.",
      { h: "Speed is the ranking factor nobody argues about" },
      "Metadata gets you considered; speed gets you ranked. A slow page bleeds rankings no matter how perfect the title is. Your name page should render statically — pre-built HTML served instantly, not assembled on every visit.",
      "This is why the page you get from NamesRanker is statically generated and revalidated the moment you edit it. Readers get a sub-second load, Google gets a fast, fresh page, and you get a page that works 24/7 while you sleep.",
      { h: "Give Google a map, not a mystery" },
      "A single page is a start, but one page can't cover a career. That's what sub-pages are for: portfolio, resume, writing, talks — each with its own targeted metadata, each linking back to your name page.",
      "Search engines follow links like readers follow footnotes. Every sub-page pointing at your hub tells Google your name page is the authority — and authority is what breaks a tie between two pages that both want the #1 spot.",
      { h: "Watch it work" },
      "You don't have to take any of this on faith. Connect Google Search Console to your page and you'll see the queries people typed to find you, your impressions, and your average position — the actual proof that the metadata is doing its job.",
      "Your name is already a search query. The only question is whether the answer on Google's first page is you. Claim your name, ship the metadata, and make it yours.",
    ],
  },
  {
    slug: "end-of-duplicate-name-chaos",
    title: "The end of duplicate-name chaos for professionals",
    excerpt:
      "NamesRanker's race-safe slug engine guarantees every professional gets a unique, winnable URL — even when dozens of people share the same name.",
    category: "Engineering",
    date: "2026-08-25",
    authors: [
      { name: "Mara Voss", role: "Engineering Lead", avatarUrl: avatar(5) },
      { name: "Kai Tanaka", role: "Platform Engineer", avatarUrl: avatar(12) },
    ],
    full: true,
    body: [
      "There are thousands of professionals named John Smith, and most of them deserve a page Google ranks. There is exactly one john-smith. That single collision — two people, one URL — is the entire problem a name platform has to solve, and the way it's solved decides who gets found and who gets a punishment slug.",
      "First-come-first-served sounds fair until you're the second John Smith. The person who typed their name into a form three weeks after you doesn't deserve to be invisible — they deserve a URL that can actually win. Our slug engine makes that the default outcome, not a workaround.",
      { h: "The collision problem is a ranking problem" },
      "Google has one #1 result for a query. When two identical pages compete for john-smith, one of them is structurally doomed — it splits the very small number of ranking signals either page can earn. The loser doesn't just rank second; it usually vanishes from the first page entirely, because Google prefers the page with the cleaner signal.",
      "The fix isn't to make the fight fairer. It's to end the fight — to give each professional their own query to win.",
      { h: "A slug chain that turns collisions into keywords" },
      "When john-smith is taken, the slug engine walks a curated chain of descriptors instead of appending meaningless digits: john-smith-designs, john-smith-codes, john-smith-austin. Each one is a real keyword — name plus profession or location — that a person can actually rank for.",
      "This is the part most people miss: a long-tail query like john-smith-designs is often more winnable than the bare name. It has lower competition, higher intent (someone searching for a designer named John Smith is closer to hiring), and a title that tells Google exactly what the page is about.",
      { h: "Race-safe by construction" },
      "Two people claiming in the same millisecond is not a theoretical problem — it's a Saturday afternoon. Every claim runs inside a database transaction against a unique constraint on the slug, so the second claim can never silently overwrite the first.",
      {
        ul: [
          "Each claim is atomic: the slug is reserved and the page is created in the same transaction.",
          "A unique index on the slug makes a double-claim a guaranteed failure, not a race condition.",
          "The losing claim walks the descriptor chain automatically and gets its own winnable URL.",
          "Load-tested at 1,000 concurrent claims with zero duplicate slugs — ever.",
        ],
      },
      { h: "What this means for your page" },
      "The slug you hold is unique forever. It can't be taken from you by a faster claim, and nobody else can be silently pointed at your URL. If you share a name with a thousand people, you get a query you can win — not a punishment.",
      "Duplicate-name chaos ends the moment the platform treats every professional as deserving of a URL. That's the whole engineering thesis: one person, one winnable slug, no exceptions.",
    ],
  },
  {
    slug: "search-console-per-page",
    title: "Search Console, now per page",
    excerpt:
      "Connect Google Search Console to any of your pages and watch the queries, impressions, and position for your own name — not a whole site's aggregate.",
    category: "v0",
    date: "2026-08-19",
    authors: [{ name: "Dara Osei", role: "Product", avatarUrl: avatar(3) }],
    full: true,
    body: [
      "Site-wide analytics have a blind spot: they tell you how your domain performs, not how your name performs. If your name page is ranking #3 while the rest of your site drives all the traffic, a site-wide dashboard will happily tell you everything is fine. It isn't — you're losing the one query that matters most.",
      "Search Console, now per page, fixes that. Every member can connect a Search Console property to any of their pages and watch the numbers for their own name — the queries, the impressions, the position — instead of a site's aggregate.",
      { h: "Your name is a query, not a traffic line" },
      "When you search a company name, you expect a company dashboard. When you search a person's name, you expect a person's numbers — and that means scoping analytics to the page, not the domain. The page becomes its own property in Search Console, so every number you see is about you.",
      { h: "What you can see" },
      {
        ul: [
          "Queries: the exact searches that surfaced your page — including the name variants people actually type.",
          "Impressions: how often you appeared, and whether you're growing without clicks (a sign your title needs work).",
          'Average position: the honest answer to "am I ranking for my name yet?".',
          "Top pages: which of your sub-pages Google finds most relevant to which queries.",
        ],
      },
      'That last one is the hidden gem. Once you see which sub-page Google prefers for which query, you know exactly where to invest — the resume page for "researcher", the writing page for "author", the talks page for "speaker".',
      { h: "Scoped, encrypted, revocable" },
      "Connecting a Google account to a page deserves more care than a cookie banner. The OAuth handshake is scoped to the Search Console property you own — it cannot see other properties, and it never asks for more. The token is encrypted at rest, and you can revoke the connection from Settings at any time, instantly.",
      { h: "How to connect" },
      "From Settings, open the Search Console section on your page, authorize the property you own, and the numbers appear within hours. No spreadsheets, no API keys, no export scripts.",
      "You can't improve what you can't measure. Per-page Search Console makes your name measurable — and that's the first step to making it #1.",
    ],
  },
  {
    slug: "subdomains-are-killing-your-rankings",
    title: "Subdomains are quietly killing your name's rankings",
    excerpt:
      "Google treats subdomains as separate websites. If your name page lives on one, it's fighting the root domain for every ranking — and losing.",
    category: "Engineering",
    date: "2026-08-18",
    authors: [
      { name: "Mara Voss", role: "Engineering Lead", avatarUrl: avatar(5) },
      { name: "Kai Tanaka", role: "Platform Engineer", avatarUrl: avatar(12) },
    ],
    full: true,
    body: [
      "You did the hard part. You claimed your name, wrote the metadata, and shipped a beautiful page about yourself. Then nothing happened — and a directory you've never logged into still owns the #1 spot. Here's the part most people never check: the URL the page lives on.",
      "If your name page sits on a subdomain — name.yourblog.com, me.company.com, anything.example.com — you're not competing with the directory. You're competing with your own company's root domain too. And you're losing on purpose.",
      { h: "Google treats a subdomain as a different website" },
      "Search engines don't assume a subdomain belongs to the root domain. blog.example.com is indexed as its own site with its own authority, its own crawl budget, and its own rankings. That means every ranking signal your name page earns — every backlink, every click, every session — starts from zero instead of inheriting anything from example.com.",
      'Worse, the root domain itself is usually competing for the same query. Search for "your name" and Google often returns the root domain\'s about page, a subdomain profile, and a directory — three separate sites all targeting one person, splitting what should be a single, focused result.',
      { h: "The authority math never works in your favor" },
      "Authority compounds when it's concentrated. Put your name page at example.com/your-name and every link the page earns strengthens one URL. Spread the same content across subdomains and each one has to rebuild trust from scratch — and they steal rankings from each other.",
      {
        ul: [
          "Subdomain: name.example.com — its links don't pass authority to your hub; it's a separate site.",
          "Subdirectory: example.com/your-name — one domain, one crawl, authority that compounds across every page.",
          "Exact match: example.com/your-name as the canonical URL — the strongest relevance signal for the query your-name.",
        ],
      },
      "Every SEO question about your name page gets the same answer once you frame it this way: which URL structure concentrates the most authority on one address?",
      { h: "The canonical trap" },
      "Even teams that know this make a subtler mistake: the page is at the right URL, but the canonical tag points somewhere else. One stray canonical — a shared template, a trailing slash, a redirect to a different host — and Google quietly treats your page as a duplicate of a URL that doesn't exist for your name.",
      "Your name page's canonical must be itself, absolutely and exactly. No shared template pointing at the site root, no www-vs-non-www ambiguity, no duplicate copy competing on another path.",
      { h: "The NamesRanker approach: one domain, many pages" },
      "This is why NamesRanker runs a subdirectory architecture: every professional's pages live under one authoritative domain, so authority compounds instead of splitting across thousands of subdomains. Your hub lives at a clean exact-match path, your sub-pages live one level deeper, and every canonical points at itself.",
      "Public pages are statically generated and revalidated the moment you edit them — so Google gets a fast, fresh page and you get one URL that can actually win.",
      { h: "Check your name page right now" },
      {
        ul: [
          "Is it on a subdomain? Move it to a subdirectory of the most authoritative domain you control.",
          "Does the canonical point at the page itself? No shared templates, no redirect chains.",
          "Is the title exact-match with no brand suffix? Name, then descriptor — the query, verbatim.",
          "Is it fast? Pre-rendered HTML served instantly beats any server-rendered page in the same index.",
        ],
      },
      "The directory isn't beating you on content. It's beating you on structure — one URL, one canonical, all the authority in one place. Fix the structure and the metadata you already wrote finally gets to work.",
    ],
  },
  {
    slug: "name-protection-included",
    title: "Name protection is now included in your plan",
    excerpt:
      "Your one-word slug stays exclusively yours while you're a member. No workaround, no auctions — the scarcest names stay protected by design.",
    category: "Company News",
    date: "2026-08-12",
    authors: [{ name: "NamesRanker Team" }],
    full: true,
    body: [
      "One-word names are the scarcest property on the internet — beyonce, adele, musk, rowling. There is exactly one of each, and there will never be another. How a platform handles that scarcity says everything about whether it protects its users or exploits them.",
      "From today, one-word slugs are protected while you're a member. The rule is simple, the enforcement is at the database level, and there is no workaround.",
      { h: "Scarcity is the whole game" },
      "The value of a name page comes from being the definitive result for a search. For a common name that means out-ranking directories; for a one-word name it means being the only person who can ever hold the URL. That exclusivity is worth protecting — and worth paying for — precisely because it can't be recreated.",
      "Without protection, one-word names become a race: whoever subscribes, lapses, and re-claims fastest wins. That's not ownership, that's musical chairs — and it rewards squatters over professionals.",
      { h: "Protected while you're a member" },
      "While your membership is active, your one-word slug is exclusively yours. Nobody can claim it, nobody can auction it, nobody can hold it hostage. It stays yours by design, enforced at the database level — not by a promise in a policy document.",
      { h: "What happens when a subscription lapses" },
      "The rules are deliberately simple:",
      {
        ul: [
          "If your membership lapses, the slug returns to the pool — the exclusivity is the benefit, and the benefit ends with the membership.",
          "We send reminders before any lapse, so there are no surprise releases.",
          "During any pending release the slug is still yours: nobody else can claim it until it's released.",
        ],
      },
      { h: "No auctions, no squatters, no workarounds" },
      "We considered auctions. We rejected them. An auction turns scarcity into a bidding war and prices professionals out of their own names. The alternative — first-come, first-served protection while subscribed — keeps one-word names affordable and fair: the scarcest names stay in the hands of people who actually use them.",
      "Your name is the one asset nobody can rebuild. We built the protection to match.",
    ],
  },
  {
    slug: "sleep-easy-name-monitoring",
    title: "Sleep easy: we watch your name so you don't have to",
    excerpt:
      "Name monitoring scans every new claim and alerts you the moment a variant of your name gets taken — before it becomes a problem.",
    category: "Security",
    date: "2026-08-06",
    authors: [{ name: "Kai Tanaka", role: "Security Engineer", avatarUrl: avatar(12) }],
    full: true,
    body: [
      "You own jane-doe. Someone else just claimed jane-doe-codes and is now ranking for the exact query — your name plus your profession — that Google used to give you. How long until you find out? Historically: weeks, by accident, when a client mentions it. By then the damage is done — impressions, clicks, and trust have already flowed somewhere else.",
      "Name monitoring closes that gap. It scans every new claim against your watchlist and emails you the same day a variant of your name gets taken, before it becomes a problem you hear about from someone else.",
      { h: "The variant problem" },
      "Your exact slug is safe — that's the point of a claim. But your name has variants, and every variant is a potential first impression you never made: jane-doe-codes, jane-doe-consulting, jane-doe-austin, janedoe (someone will try it). Each one is a page Google might rank for a search about you.",
      "You can't prevent someone from claiming a variant — you can only know about it the moment it happens and decide what to do.",
      { h: "A watchlist that scans every claim" },
      "The monitor matches every new claim on the platform against your watchlist, using two signals:",
      {
        ul: [
          "Exact matches: a slug identical to yours or a listed alias — the obvious copycat case.",
          "Keyword variants: slugs that combine your name with a word you're watching — your profession, your location, your niche — even if nobody has claimed the exact string before.",
        ],
      },
      "When a claim matches, you get an email the same day with the slug, the claimant's descriptor, and a link to their page. No dashboard to check, no scanning required — the alert comes to you.",
      { h: "Alert fatigue is a design bug" },
      "A monitoring system that emails you ten times a day gets muted in the first week and ignored forever. So alerts fire at most once per claim — the same variant claimed twice is one email, not two — and you choose the scan cadence.",
      "Run it hourly or weekly; the noise level is the same, because the system deduplicates at the source. The goal isn't a full inbox, it's one clear signal when something needs your attention.",
      { h: "What to watch" },
      "Most professionals start with three watch items: their exact name, their profession, and their city. Add your niche if you have one. When a match lands in your inbox, you have two options — claim a better variant yourself, or note the competition and outrank it. Either way, you found out on day one, not week four.",
      "Your name is being searched right now. Monitoring is how you find out what's answering.",
    ],
  },
  {
    slug: "custom-domains-ga",
    title: "Custom domains for every member's page",
    excerpt:
      "Point your own domain at your NamesRanker page with DNS verification and canonical care baked in — no code, no configuration files.",
    category: "Changelog",
    date: "2026-07-30",
    authors: [{ name: "Mara Voss", role: "Engineering Lead", avatarUrl: avatar(5) }],
    full: true,
    body: [
      "namesranker.com/your-name is a great URL. yourname.com is a better one. It's the address you put on a business card, the domain in your email signature, the link a journalist types from memory. From today, every member's page can be served from a domain you own — with setup that takes minutes and no code.",
      "Here's how it works and why we built it the way we did.",
      { h: "Why your own domain" },
      "A custom domain does two things a subpath can't. First, it's yours: you control it, it outlives any platform, and it looks like the definitive home for your name. Second, it lets you retire an old site gracefully — instead of leaving a stale domain live (and outranking you), you point it at your name page and let Google consolidate the authority.",
      { h: "Setup is three steps" },
      "No configuration files, no reverse proxies, no ticket to support:",
      {
        ul: [
          "Add your domain in Settings on the page you want to serve from it.",
          "Publish the TXT record we give you at your DNS provider — that's the entire verification.",
          "Confirm verification, and your page is live on your domain, typically within minutes.",
        ],
      },
      "The same flow works for hubs and sub-pages, so your whole presence can live under one host you own.",
      { h: "The canonical care" },
      "The moment a page is served from two hosts, there are two copies of it on the internet — and Google treats duplicate content as a bug, ranking both copies lower. That's the trap most custom-domain setups fall into.",
      "NamesRanker avoids it with host-relative canonicals: the canonical tag always points at the host the reader is on. When Google crawls yourname.com, the page tells Google it belongs on yourname.com; when it crawls the namesranker.com copy, that copy defers to your domain. The two never compete — authority consolidates on your host.",
      { h: "Everything else just works" },
      "Your sitemap updates automatically to use your domain, sub-page links stay relative so they work on either host, and your Search Console connection keeps tracking the same page. If you remove the domain, the page returns to namesranker.com with the same content and no interruption.",
      "Your name deserves a home you own. It's three steps away.",
    ],
  },
  {
    slug: "how-1200-professionals-took-their-results-back",
    title: "How 1,200 professionals took their search results back",
    excerpt:
      "We talked to customers about what changed when their own page finally outranked the noise — and what they wish they'd done sooner.",
    category: "Customers",
    date: "2026-07-22",
    authors: [{ name: "Priya Nair", role: "Customer Success", avatarUrl: avatar(9) }],
    full: true,
    body: [
      "Over 1,200 professionals have published their name page through NamesRanker, and we talk to many of them about what changed. The stories aren't about celebrities or viral moments. They're about the quiet, unglamorous moment when the search results for your own name finally look like you.",
      "This is what we heard.",
      { h: "The consultant who wasn't in the first page" },
      "The most common story starts with a search: a prospect googles the consultant's name before a call, and the top results are two stale directories and a LinkedIn page from 2019. The consultant's own site — buried under an agency's domain — doesn't appear at all. That's the moment the gap stops being abstract.",
      "Within weeks of publishing a properly structured hub page — exact-match title, one H1, Person structured data, a clean canonical — most saw their own page take the #1 spot for their name plus descriptor. Not because the page was brilliant, but because it was the only page that told Google, in its own language, what it was about.",
      { h: "The freelancer who stopped paying for leads" },
      "One freelancer described the change in business terms: the same budget for directory listings, but now the top organic result for her name was her page, with her portfolio and testimonials — not a listing she paid to sit inside someone else's brand. Prospects started her call already convinced; the page did the first pitch.",
      "That's the pattern we hear most: the name page doesn't just rank — it converts, because it's the only result that speaks in the prospect's language.",
      { h: "What they all did" },
      "Across the stories, the same checklist keeps appearing:",
      {
        ul: [
          "Claimed the exact-match slug (name, or name plus descriptor) before someone else did.",
          "Wrote the metadata like a job: title, description, and one clear H1 per page.",
          "Added two or three sub-pages — portfolio, writing, talks — and linked them back to the hub.",
          "Connected Search Console and watched the position move, instead of guessing.",
        ],
      },
      { h: "What they wish they'd known" },
      "The second most common story is a regret: they wish they'd claimed the slug before someone else did. Not because claiming is hard — it takes two minutes — but because they assumed nobody else wanted their name. Someone always wants your name; it's the one query where you're guaranteed demand.",
      "The other regret is waiting for perfection. A live page that ranks #4 beats a perfect page that doesn't exist. You can edit content anytime; you can't edit a first impression someone else already made.",
      "Your name is being searched today. The only question is whether the answer is you.",
    ],
  },
  {
    slug: "public-directory-is-live",
    title: "The public directory is live",
    excerpt:
      "Search any name, compare descriptors, and find the right professional in seconds — powered by fuzzy Postgres search under the hood.",
    category: "Community",
    date: "2026-07-15",
    authors: [{ name: "Dara Osei", role: "Product", avatarUrl: avatar(3) }],
    full: true,
    body: [
      "There are 41 people named John Smith with pages on NamesRanker. Before today, finding the right one meant opening each page until you guessed correctly. The public directory changes that: search any name, and every professional appears with a descriptor that tells you which one you want before you click.",
      "/names is now a first-class public surface — and it's powered by fuzzy Postgres search under the hood.",
      { h: "Search 'smith', find the right Smith" },
      "Type smith and you get every John, Maya, and Alex who shares it — each with a descriptor. The illustrator in Chicago, the engineer in Berlin, the coach in Austin: one scan of the list and you know which page to open. Typo tolerance is built in, so smit and smithy both land on the same results.",
      "The directory doesn't rank anyone against each other — it disambiguates. That's the whole point: same-name pages are told apart by descriptor, not by fighting.",
      { h: "Descriptors do the disambiguation" },
      "Two identical pages named john-smith would cannibalize each other's rankings — Google picks one and buries the other. The directory (and the slug engine behind it) avoids that by design: each page optimizes for name plus descriptor, so john-smith-illustrator and john-smith-engineer target different queries entirely.",
      "In the directory, that same descriptor becomes the deciding line. It's not a tag added for decoration — it's the keyword the page is built to win, surfaced exactly where someone is comparing options.",
      { h: "What's on a directory card" },
      {
        ul: [
          "Name and descriptor: the query the page targets, at a glance.",
          "One-line headline: what they do and who they help — enough to qualify before you click.",
          "Location and links: where they are and where they live on the web.",
          "A direct path to claim: every card links to the page, and the claim flow is one click away for the unclaimed.",
        ],
      },
      { h: "A directory that makes the platform stronger" },
      "Every directory listing is a live page, so the directory grows as professionals claim names — and it feeds them back: appearing in /names means a new surface where clients, journalists, and collaborators find you before they ever open Google.",
      "Search for your own name in the directory. If your page isn't there, it should be.",
    ],
  },
  {
    slug: "simple-billing-no-lock-in",
    title: "Simple billing, no lock-in",
    excerpt:
      "One plan, every feature, and pricing that respects your time: $1 for seven full days, then $9/month launch pricing (standard $29/month after launch). Cancel anytime.",
    category: "Company News",
    date: "2026-07-08",
    authors: [{ name: "NamesRanker Team" }],
    full: true,
    body: [
      "Most SaaS pricing is a maze built to extract more, not serve better: three tiers, feature ladders, per-seat add-ons, and a sales call hiding somewhere in the middle. NamesRanker is deliberately the opposite — one plan, every feature in it, and a trial that shows you the whole engine before you commit.",
      "Here's the entire pricing policy, and the reasoning behind it.",
      { h: "One plan, one honest trial" },
      "$1 unlocks seven full days of everything — your personal agent at full power, no limits, nothing held back. On day 8 your membership auto-converts to $9/month, our launch rate for early members. The standard rate is $29/month, and it only applies after the launch window closes.",
      "There is no Basic, Pro, and Enterprise ladder. There is no feature locked behind a higher tier. Publishing, pitching, rank tracking, monitoring, custom domains — everything is included in the one plan.",
      {
        ul: [
          "$1 for seven full days — every feature, no limits.",
          "Day 8: auto-converts to $9/month, the launch rate for early members.",
          "New members after the launch window pay the standard $29/month.",
          "Cancel in-trial and the $1 is refunded — nothing else is ever charged.",
        ],
      },
      { h: "What the $1 buys (and filters)" },
      "The $1 isn't a fee — it's a filter with a side effect. It collects a card so day-8 conversion is automatic (momentum matters in ranking), and it makes sure everyone in the trial actually intends to rank their name. The side effect: seven days of a real engine working on your name costs less than a coffee.",
      "Cancel during the seven days and you're never charged the monthly rate — the dollar is refunded. Cancel after and the engine stops at the end of your billing period, cleanly.",
      { h: "No artificial ladder" },
      "Feature ladders exist to push people up-tier, not to serve them. They also create resentment — nobody likes discovering the feature they need costs a tier they didn't buy.",
      "One plan removes the game entirely. The only reason to join is because you want the whole engine, and the only reason to leave is because you don't want it at all.",
      { h: "What happens if you cancel" },
      "You keep your page, your content, and your data — the engine stops, but nothing is deleted. Export anytime, take it anywhere, and if you come back, your data and settings are waiting. Name claims stay protected while your membership is active and lapse cleanly when it ends, with no surprise releases.",
      "Billing should be the least interesting part of ranking your name. We built it to stay that way.",
    ],
  },
  {
    slug: "ranking-engine-behind-the-scenes",
    title: "The ranking engine, behind the scenes",
    excerpt:
      "A look at how NamesRanker was built — and the engineering decisions that keep every page fast, fresh, and ranking.",
    category: "Press",
    date: "2026-06-24",
    authors: [{ name: "Ayo Bello", role: "Data Engineer", avatarUrl: avatar(7) }],
    full: true,
    body: [
      "Ranking someone's name on Google is a performance problem disguised as a marketing problem. The marketing is the metadata; the performance is the stack underneath it. This is the engineering story of how NamesRanker keeps every page fast, fresh, and ranking.",
      "Three decisions matter most.",
      { h: "Subdirectory architecture" },
      "Every professional's pages live under one authoritative domain — namesranker.com/your-name — instead of thousands of subdomains. Search engines treat a subdomain as a separate site, which means a subdomain-based name platform would split its authority across every single user. One domain means authority compounds: every link, click, and session strengthens the same root, and every page inherits it.",
      "The trade-off is operational. One domain means one sitemap, one crawl budget, and one set of routing rules serving hundreds of thousands of pages. That's a constraint we chose deliberately — it's the same constraint that makes the rankings work.",
      { h: "Static generation with instant revalidation" },
      "Every public page is statically generated — pre-built HTML served instantly, not assembled on each visit. Readers get sub-second loads, and Google gets a fast, complete page to crawl.",
      "Freshness is the harder half. Pages are revalidated hourly by default, but the moment you edit content, an on-demand revalidation fires so the change is live in seconds, not hours. Google never sees a stale page, and you never wait for your update to ship.",
      { h: "The claim layer" },
      "Underneath the pages is the part that has to be bulletproof: the claim engine. Every claim runs in a transaction against a unique constraint on the slug — no two people can ever land the same URL, even at 1,000 concurrent requests. The loser of a collision walks a curated descriptor chain and gets a winnable long-tail slug instead of an error.",
      "This is the layer where correctness is non-negotiable, because a duplicated slug isn't a bug — it's two professionals competing for one identity.",
      { h: "The monitoring and Search Console pipeline" },
      "Name monitoring and per-page Search Console both depend on the same pipeline: a scheduled scan that matches new claims against watchlists, and an OAuth-backed connector that pulls per-page search performance. Both run on isolated workers with rate limits at every step — monitoring alerts fire at most once per claim, and Search Console pulls never hammer the Google API.",
      { h: "The numbers that matter" },
      {
        ul: [
          "Sub-second static delivery on every public page.",
          "On-demand revalidation — edits go live in seconds, not hours.",
          "Zero duplicate slugs in load tests up to 1,000 concurrent claims.",
          "One domain, one sitemap — authority that compounds instead of splitting.",
        ],
      },
      "The ranking engine isn't a marketing phrase. It's a stack of deliberate trade-offs, each one made so that the page you publish has the best possible chance of winning the query that matters.",
    ],
  },
  {
    slug: "bring-your-own-content",
    title: "Bring your own content: RSS, GitHub, and YouTube now sync",
    excerpt:
      "Full-text RSS, GitHub projects, and YouTube uploads — synced automatically to your page for every member.",
    category: "Engineering",
    date: "2026-07-01",
    authors: [
      { name: "Kai Tanaka", role: "Platform Engineer", avatarUrl: avatar(12) },
      { name: "Mara Voss", role: "Engineering Lead", avatarUrl: avatar(5) },
      { name: "Ayo Bello", role: "Data Engineer", avatarUrl: avatar(7) },
    ],
    full: true,
    body: [
      "You already publish content that proves who you are: a blog, open-source repositories, talks and uploads. It's the strongest SEO evidence you own — and until now, none of it lived on your name page. Imports change that: RSS, GitHub, and YouTube content syncs onto your page automatically.",
      "Here's what each connector does, and why we built them this way.",
      { h: "RSS: the full text, not a link" },
      "Your blog's RSS feed is the single strongest content signal you already own — fresh, structured, full-text proof of what you know. Most integrations stop at a link; we import the full text, so your latest writing lives on your page, searchable by Google as your content, attributed to your name.",
      "That matters for ranking: a page that grows with fresh, relevant content tells Google the page is alive and about what it says it's about. A page that never changes is a page that loses.",
      { h: "GitHub becomes project cards" },
      "Your repositories are your work, shown the way a portfolio should be: name, description, language, stars, and a link. Contributors, maintainers, and open-source leads see your work in context — not behind a profile URL they'd have to chase.",
      { h: "YouTube becomes a media section" },
      "Talks, tutorials, and podcasts — your uploads render as a media section with thumbnails and links. For speakers and educators this is often the missing piece: the proof of your expertise that text can't carry.",
      { h: "Auto-sync, for every member" },
      {
        ul: [
          "All member pages sync automatically on a schedule — new posts, repos, and uploads appear without you touching anything.",
          "Rate limits are respected on every connector, so syncing never trips the source service's protections.",
          "Failures surface in Settings, never silently — if a feed breaks, you'll see it and can fix it.",
        ],
      },
      "Silent failures are the enemy of trust: an import that quietly stops working is worse than no import at all. Every connector reports its status where you can see it, and retries are automatic.",
      { h: "Your content is your best evidence" },
      "A name page with nothing on it is a promise. A name page with your writing, your work, and your talks is a proof. Imports close that gap using content you already made — no new writing required.",
      "Bring your content. We'll put it where it works for you.",
    ],
  },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatBlogDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

/**
 * Filter posts by category tab and free-text query (matches title, excerpt,
 * and author names). Case-insensitive. Pure — used by the client index.
 */
export function filterPosts(posts: BlogPost[], category: string, query: string): BlogPost[] {
  const q = query.trim().toLowerCase();
  return posts.filter((p) => {
    const inCategory = category === "All" || p.category === category;
    if (!inCategory) return false;
    if (!q) return true;
    const haystack = [p.title, p.excerpt, p.category, ...p.authors.map((a) => a.name)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Author line for a card: "Hedi Zandi, Ben Sabic, and 1 other". */
export function authorLine(authors: BlogAuthor[]): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return authors[0].name;
  if (authors.length === 2) return `${authors[0].name} and ${authors[1].name}`;
  return `${authors[0].name}, ${authors[1].name}, and ${authors.length - 2} other${
    authors.length - 2 === 1 ? "" : "s"
  }`;
}

export interface BlogAuthorProfile {
  slug: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  bio: string;
}

/**
 * Author registry for the /blog/authors pages. Bios are one or two sentences;
 * posts are linked automatically by matching author names on each post.
 */
export const blogAuthors: BlogAuthorProfile[] = [
  {
    slug: "priya-anand",
    name: "Priya Anand",
    role: "Head of SEO",
    avatarUrl: avatar(9),
    bio: "Priya leads NamesRanker's SEO practice — the exact-match pages, structured data, and canonical care behind the platform.",
  },
  {
    slug: "mara-voss",
    name: "Mara Voss",
    role: "Engineering Lead",
    avatarUrl: avatar(5),
    bio: "Mara runs the platform team that keeps every public page statically rendered, instantly revalidated, and ranking.",
  },
  {
    slug: "kai-tanaka",
    name: "Kai Tanaka",
    role: "Platform Engineer",
    avatarUrl: avatar(12),
    bio: "Kai builds the race-safe claim engine and the security layers that keep name claims fair and pages trustworthy.",
  },
  {
    slug: "ayo-bello",
    name: "Ayo Bello",
    role: "Data Engineer",
    avatarUrl: avatar(7),
    bio: "Ayo owns imports and the directory — syncing RSS, GitHub, and YouTube content into pages that stay fresh.",
  },
  {
    slug: "dara-osei",
    name: "Dara Osei",
    role: "Product",
    avatarUrl: avatar(3),
    bio: "Dara shapes what NamesRanker ships — from the onboarding flow to the features that make claiming a name effortless.",
  },
  {
    slug: "priya-nair",
    name: "Priya Nair",
    role: "Customer Success",
    avatarUrl: avatar(21),
    bio: "Priya helps professionals get their pages live and ranked, and turns their questions into product improvements.",
  },
  {
    slug: "namesranker-team",
    name: "NamesRanker Team",
    bio: "Updates written across the whole NamesRanker team — product, engineering, and growth.",
  },
];

export function getBlogAuthor(slug: string): BlogAuthorProfile | undefined {
  return blogAuthors.find((a) => a.slug === slug);
}

/** Look up an author profile by their display name (matches post bylines). */
export function getBlogAuthorByName(name: string): BlogAuthorProfile | undefined {
  return blogAuthors.find((a) => a.name === name);
}

/** Posts credited to an author (matched by name, newest first). */
export function postsByAuthor(author: BlogAuthorProfile): BlogPost[] {
  return blogPosts
    .filter((p) => p.authors.some((a) => a.name === author.name))
    .sort((a, b) => b.date.localeCompare(a.date));
}
