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
    q: "How do I get started?",
    a: "Create your account, verify your email, and upload your resume — that's the only input we need. Your personal agent then studies it overnight, maps what Google already shows for your name, and comes back to chat with a plan: what it will build, where it will publish and pitch you, and your baseline rank. You approve what makes sense, and the agent runs it.",
  },
  {
    category: "Getting started",
    q: "Do I need to create accounts on LinkedIn, Medium, or other platforms first?",
    a: "No. We never create accounts for you on third-party platforms — and we never need you to go create a pile of them. Your agent first discovers the profiles you already have by studying your resume and searching the web. Where a genuinely valuable profile is missing, the agent drafts the entire profile from your resume and you just complete the signup in about 90 seconds.",
  },
  {
    category: "Getting started",
    q: "What happens after I upload my resume?",
    a: "Your agent parses it into your footprint: who you are, what you've done, what you've published, and the queries people actually search to find you. It captures a baseline of your current Google results, then brings you a prioritized plan — quick wins first (your page on NamesRanker, junk results pushed down), then the platforms and pitches that matter for your profession.",
  },
  {
    category: "Getting started",
    q: "Do I have to keep coming back to the chat?",
    a: "The agent does all the work in the background — you don't babysit it. Chat is where you approve batches (drafts, pitches), answer quick questions, and see what happened. Most members spend about ten minutes a week with their agent, plus a weekly report card that lands automatically.",
  },
  {
    category: "SEO & ranking",
    q: "Is my name really guaranteed to rank #1?",
    a: "No platform can honestly guarantee a #1 ranking — anyone who does is overselling. What we promise is the full mechanism, run continuously: an SEO-engineered page built from your resume, a consistent identity web across the platforms that matter for your profession, real published work that links back to you, third-party pitches (podcasts, guest spots, directories), and rank tracking that shows the line moving. Names typically reach the first page within weeks; #1 is our target, and the engine keeps working until you get there.",
  },
  {
    category: "SEO & ranking",
    q: "How does an agent actually get my name to rank?",
    a: "Google ranks people by building an entity from consistent signals: the same name, photo, and descriptor appearing on many pages it trusts. Your agent creates that consistency — it keeps every profile aligned, publishes your works (transformed per platform, never duplicated), gets you placed on external sites, and tracks your watched queries so it knows what's working and feeds it.",
  },
  {
    category: "SEO & ranking",
    q: "What if someone else shares my name?",
    a: "That's exactly the problem the platform was built for. Your exact name slug is yours alone, and pages are differentiated by descriptor so same-name professionals don't cannibalize each other. Your agent also watches variants of your name and alerts you the moment something new appears for it — before it becomes the result people see.",
  },
  {
    category: "SEO & ranking",
    q: "Can I see my name move on Google?",
    a: "Yes — that's the proof layer. Your agent tracks the queries people search to find you, captures regular Google snapshots, and shows your position history in chat and on your profile. When you jump (#7 → #3, for example), you get an alert. Every trial member gets a baseline on day one so the movement is visible from the start.",
  },
  {
    category: "Premium & pricing",
    q: "What does it cost?",
    a: "One plan, no tiers. $1 unlocks seven full days of everything — no limits, every feature, the agent running at full power. On day eight your membership auto-converts to the launch promo rate of $9/month (standard rate is $29/month once the launch window closes). Cancel anytime before day eight and nothing further is charged — your $1 is refunded.",
  },
  {
    category: "Premium & pricing",
    q: "What's included in the plan?",
    a: "Everything. Your personal agent, the study engine, publishing across your platforms, pitching to podcasts and publications, rank tracking, monitoring, custom domains, and support — there is no feature ladder and nothing locked behind a higher tier. One plan, every feature, no limits.",
  },
  {
    category: "Premium & pricing",
    q: "Why is there no free plan?",
    a: "Because this is a worker, not a widget. Ranking a name takes a machine running continuously — studying, publishing, pitching, tracking — and that machine can't be honestly delivered for free. We'd rather charge a fair price and run the engine properly than offer a free tier that quietly does nothing. The $1 trial exists so you can verify the engine works on your own name before paying the real rate.",
  },
  {
    category: "Premium & pricing",
    q: "Can I cancel my membership?",
    a: "Yes, anytime, from Settings — no lock-in, no retention maze. If you cancel during the seven-day trial, you're not charged beyond the $1 deposit (which is refunded). After that, canceling stops the engine and future billing, but your data, your page, and your content stay yours — export it whenever you want.",
  },
  {
    category: "Premium & pricing",
    q: "What payment methods do you accept?",
    a: "Payments are processed securely by Stripe. We support all major credit and debit cards. The $1 trial deposit authorizes and stores your card so day-eight renewal is automatic — cancel in the trial and you'll never be charged the monthly rate.",
  },
  {
    category: "Features",
    q: "Which platforms does the agent publish to?",
    a: "Only platforms that officially allow programmatic agents, and only your own works — never scraped content, never anything you didn't write or make. Full API platforms (GitHub, WordPress, Ghost, Dev.to, YouTube, Google Business) are published automatically; Medium, X, and Reddit with your confirmation on a cadence; and for closed platforms like LinkedIn and Instagram, the agent prepares the perfect post and you paste it in chat — about thirty seconds.",
  },
  {
    category: "Features",
    q: "How do pitches to podcasts and websites work?",
    a: "Your agent keeps a ledger of opportunities in your profession — podcasts that take guests, blogs that accept contributions, directories you should be listed in, journalists requesting expert sources. Each week it matches you to the best ones, drafts a personalized pitch from your real work, and shows you the batch in chat. One tap approves; the agent sends with strict rate limits and, when accepted, hands the host a ready-to-publish kit — bio, headshot, topics, links.",
  },
  {
    category: "Features",
    q: "Can I bring my own domain?",
    a: "Yes. Every member can serve their page from a domain they own. Add it in Settings, publish the DNS record your agent gives you, and your page goes live on your own domain with host-correct canonical URLs — your custom domain never competes with the namesranker.com copy, so authority consolidates on the URL you control.",
  },
  {
    category: "Features",
    q: "What is the name directory?",
    a: "The directory is a searchable index of claimed names by profession and location — one of the fastest, most valuable pages you can earn, because it's how people discover you through your name and how your page picks up the internal links that boost your ranking. Your agent keeps your listing accurate as part of your footprint.",
  },
  {
    category: "Account & data",
    q: "Who owns my content and my page?",
    a: "You do. Your content is yours, your page is yours, and you can export everything or delete your account at any time. We never claim ownership of what you publish, and every published work carries a canonical link back to your original so the authority always points at you.",
  },
  {
    category: "Account & data",
    q: "Can I limit what my agent is allowed to do?",
    a: "Yes — that's the permission envelope, and you control it in Settings. Every surface is set to one of four levels: never touch, draft only, auto-post with a copy, or full auto. The agent can never act outside your envelope, and every action is logged to your work feed so you can see exactly what it did and why.",
  },
  {
    category: "Account & data",
    q: "Is my data used to train models?",
    a: "No. Your resume, footprint, and conversations are used to run your agent and nothing else. The agent only ever acts on your authorized sources and inside your permission envelope — it never scrapes the web about you beyond discovering the public profiles you point it to.",
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
