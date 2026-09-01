export interface FaqItem {
  q: string;
  a: string;
  category: string;
}

export const FAQ_CATEGORIES = [
  "Getting started",
  "SEO & ranking",
  "Premium & pricing",
  "Features",
  "Account & data",
] as const;

export const faqItems: FaqItem[] = [
  {
    category: "Getting started",
    q: "How do I claim my name?",
    a: "Enter your name on the landing page, confirm it's available, and publish. Claiming is first-come, first-served: once you claim a name, no one else can take it. From there you can build your page, add sub-pages, and connect your content.",
  },
  {
    category: "Getting started",
    q: "Why does claiming a name matter?",
    a: "There are limited clean, short slugs available, and we allocate them first-come, first-served. If someone else claims yourname and ranks it first, the search result for your name is theirs. Claim yours to control the #1 result.",
  },
  {
    category: "Getting started",
    q: "What can I put on my page?",
    a: "A photo, a bio, your projects and links, sub-pages like Portfolio or Resume, and full SEO control — title, description, and social previews. Import content from RSS, GitHub, or YouTube and it stays in sync automatically.",
  },
  {
    category: "Getting started",
    q: "Is my page live immediately after I publish?",
    a: "Yes. Your page is served statically for speed and SEO, and every edit you make revalidates it instantly. Changes to your content, links, and SEO settings appear on the live page right away.",
  },
  {
    category: "SEO & ranking",
    q: "Is my name really guaranteed to rank #1?",
    a: "NamesRanker builds an SEO-engineered page — clean semantic markup, fast ISR rendering, structured data, and careful internal linking — that we ladder up Google over time. Most single-name pages reach the first page within weeks; #1 is our target, not a contract. Two-word names are the easiest to rank, which is why those are free.",
  },
  {
    category: "SEO & ranking",
    q: "How is my page optimized for search engines?",
    a: "Every page ships with clean semantic HTML, JSON-LD structured data, OpenGraph and Twitter cards, a fast static render, and canonical URLs that never compete with themselves. Sub-pages follow a deliberate hub-and-spoke structure so your main name page collects the most authority.",
  },
  {
    category: "SEO & ranking",
    q: "Can I track how my page performs on Google?",
    a: "With Premium, you can connect Google Search Console per page and see queries, impressions, clicks, and average position — plus the exact keywords driving traffic — refreshed on demand from the settings page.",
  },
  {
    category: "SEO & ranking",
    q: "What is name protection and monitoring?",
    a: "Name protection reserves the close variants of your name so nobody else can claim them. Monitoring watches the web for new claims of your name — including keyword and numbered variants — and alerts you by email the moment one appears.",
  },
  {
    category: "Premium & pricing",
    q: "What does it cost?",
    a: "Two-word names are free — claim yours and build your page at no cost. One-word names (think 'Beyoncé' or 'Google') and premium features like name protection, monitoring, unlimited sub-pages, and a custom domain are part of Premium.",
  },
  {
    category: "Premium & pricing",
    q: "What's included in Premium?",
    a: "One-word name claims, a custom handle, a custom domain you fully own, name protection, name monitoring with email alerts, unlimited sub-pages, per-page Google Search Console analytics, and more. See the pricing page for the full breakdown.",
  },
  {
    category: "Premium & pricing",
    q: "Can I cancel my subscription?",
    a: "Yes, anytime — no lock-in. Your page stays live and public, and you keep every name you've claimed. You just lose access to the Premium-only features and one-word claims going forward.",
  },
  {
    category: "Premium & pricing",
    q: "What payment methods do you accept?",
    a: "Payments are processed securely by Stripe. We support all major credit and debit cards, and subscriptions renew automatically until you cancel.",
  },
  {
    category: "Features",
    q: "Can I bring my own domain?",
    a: "Yes. Premium unlocks a custom domain so your page lives at a URL you fully own. After adding it in settings, we give you a DNS TXT record to publish; once verified, your page is served from your domain with host-correct canonical URLs, and your sub-pages map cleanly onto it.",
  },
  {
    category: "Features",
    q: "What content sources can I import from?",
    a: "RSS feeds (blogs, podcasts, newsletters), GitHub (repositories and pinned work), and YouTube (channels and videos). Imports pull in your latest items automatically on a schedule, so your page stays fresh without manual updates.",
  },
  {
    category: "Features",
    q: "What is the name directory?",
    a: "The directory is a searchable, filterable index of claimed names — by profession, location, and more. It's how people discover you through your name and how your page earns valuable internal links that boost your ranking.",
  },
  {
    category: "Features",
    q: "How do sub-pages work?",
    a: "Each claimed name has a hub page (your name) and can have spoke pages like /portfolio, /resume, or /contact. Sub-pages inherit your branding, get their own SEO settings, and link back to your hub — the classic hub-and-spoke structure search engines reward.",
  },
  {
    category: "Account & data",
    q: "Can I export or delete my data?",
    a: "Yes. From settings you can export everything you've created in a portable format, or permanently delete your account and all associated data. Exports are available instantly; deletions are processed immediately.",
  },
  {
    category: "Account & data",
    q: "Who owns my content and my page?",
    a: "You do. Your content is yours, and you can take it with you at any time. We never claim ownership of your page, and if you leave, your page stays live unless you choose to delete it.",
  },
  {
    category: "Account & data",
    q: "Can I change my handle or URL later?",
    a: "With Premium, you can set a custom handle for your page. Two-word claims keep their slug by default, and custom handles let you redirect your existing URL so you never lose traffic.",
  },
];

/** Filter FAQ items by category and a free-text query (matches question + answer). */
export function filterFaq(items: FaqItem[], category: string, query: string): FaqItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== "All" && item.category !== category) return false;
    if (!q) return true;
    return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
  });
}
