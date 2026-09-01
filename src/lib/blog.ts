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

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  authors: BlogAuthor[];
  /** Body paragraphs (kept short — full posts land with the CMS swap). */
  body: string[];
}

const avatar = (img: number) => `https://i.pravatar.cc/96?img=${img}`;

export const blogPosts: BlogPost[] = [
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
    body: [
      "Two people named John Smith want john-smith. Both deserve it — but Google only has one #1 result. Our slug chain resolves the collision with a curated keyword: john-smith-designs, john-smith-codes, john-smith-austin.",
      "Every claim runs inside a transaction with a unique constraint, so no two people can ever land the same slug — even under a 1,000-request race. The loser gets a more specific, more winnable long-tail query instead of a punishment.",
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
    body: [
      "Until now, seeing how your name actually performs on Google meant wading through site-wide dashboards. Premium users can now connect Search Console per page and see exactly which queries surface their name, their position, and their impression share.",
      "The OAuth handshake is encrypted at rest and scoped to the Search Console property you own — nothing more.",
    ],
  },
  {
    slug: "name-protection-included",
    title: "Name protection is now included with Premium",
    excerpt:
      "Your one-word slug stays exclusively yours while subscribed. No workaround, no auctions — the scarcest names stay protected by design.",
    category: "Company News",
    date: "2026-08-12",
    authors: [{ name: "NamesRanker Team" }],
    body: [
      "One-word names like beyonce or adele are the scarcest property on the platform — and from today they're protected while you're a Premium subscriber. If your subscription lapses on a monthly plan, the slug returns to the pool immediately; annual plans get a 30-day grace period before release.",
      "No auctions, no squatters, no workarounds. The rule is simple and enforced at the database level.",
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
    body: [
      "A copycat claiming jane-doe-codes while you own jane-doe used to be something you'd discover weeks later, by accident. Our monitoring scan matches every new claim against your watchlist — exact slugs and keyword variants — and emails you the same day.",
      "Alerts fire at most once per claim, so you can run the scan on any cadence without inbox noise.",
    ],
  },
  {
    slug: "custom-domains-ga",
    title: "Custom domains for every premium page",
    excerpt:
      "Point your own domain at your NamesRanker page with DNS verification and canonical care baked in — no code, no configuration files.",
    category: "Changelog",
    date: "2026-07-30",
    authors: [{ name: "Mara Voss", role: "Engineering Lead", avatarUrl: avatar(5) }],
    body: [
      "Add your domain in Settings, publish one TXT record, and verify. Your page is then served from your own host with host-relative canonicals — so your domain and the namesranker.com copy never compete in Google's index.",
      "It works for hubs and sub-pages, and the sitemap updates automatically.",
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
    body: [
      "The most common story isn't a celebrity name — it's the consultant whose LinkedIn page was the third result behind two stale directories. Within weeks of publishing a properly structured hub page, most saw their own page take the #1 spot for their name plus descriptor.",
      "The second most common story: they wish they'd claimed the slug before someone else did.",
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
    body: [
      "/names is now a first-class public surface. Search 'smith' and get every John with a descriptor that tells you which one is the illustrator in Chicago and which is the engineer in Berlin — before you click.",
      "Same-name pages are disambiguated by descriptor, not by SEO cannibalization: each optimizes for name + profession.",
    ],
  },
  {
    slug: "simple-billing-no-lock-in",
    title: "Simple billing, no lock-in",
    excerpt:
      "One premium plan, three ways to pay, and a grace period that respects your one-word name. Monthly, annual, or lifetime — your call.",
    category: "Company News",
    date: "2026-07-08",
    authors: [{ name: "NamesRanker Team" }],
    body: [
      "Premium is one plan: $30 a month, $299 a year, or $1,399 once. Every premium feature is in every tier — no artificial ladder.",
      "Cancel on an annual plan and your one-word name stays protected through a 30-day grace window with reminders at days 7, 1, and 0. It's the respectful way to lapse.",
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
    body: [
      "NamesRanker runs on a subdirectory architecture: every professional's pages live under one authoritative domain, so authority compounds instead of splitting across thousands of subdomains.",
      "Public pages are statically generated and revalidated hourly, with on-demand revalidation the moment you edit content — fast for readers, fresh for Google.",
    ],
  },
  {
    slug: "bring-your-own-content",
    title: "Bring your own content: RSS, GitHub, and YouTube now sync",
    excerpt:
      "Full-text RSS, GitHub projects, and YouTube uploads — synced automatically to your page for premium users, manually for everyone else.",
    category: "Engineering",
    date: "2026-07-01",
    authors: [
      { name: "Kai Tanaka", role: "Platform Engineer", avatarUrl: avatar(12) },
      { name: "Mara Voss", role: "Engineering Lead", avatarUrl: avatar(5) },
      { name: "Ayo Bello", role: "Data Engineer", avatarUrl: avatar(7) },
    ],
    body: [
      "Your blog's RSS feed is the strongest SEO signal you already own — we import the full text, not a link. GitHub pulls your repos as project cards, and YouTube brings your uploads in as a media section.",
      "Premium pages auto-sync on a schedule; free pages sync manually. Rate limits are respected and failures surface in Settings, never silently.",
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
