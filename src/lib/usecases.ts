export interface UseCase {
  slug: string;
  audience: string;
  tagline: string;
  summary: string;
  /** The result the person wants — shown as a headline over the story. */
  outcome: string;
  /** Short scenario blurb for the card. */
  scenario: string;
  challenges: string[];
  howItWorks: { step: string; detail: string }[];
  features: string[];
  /** Demo profile path to link from the story page. */
  demo?: { label: string; path: string };
}

export const useCases: UseCase[] = [
  {
    slug: "freelancers-consultants",
    audience: "Freelancers & consultants",
    tagline: "Be the first result when a client checks you out",
    summary:
      "Show up ahead of Upwork, LinkedIn, and directory pages the moment a prospect searches your name.",
    outcome: "New clients see your work — not someone else's profile — before they decide.",
    scenario:
      "A prospect hears about you from a colleague and Googles your name before booking a call.",
    challenges: [
      "Upwork, LinkedIn, and rating sites rank above your portfolio for your own name.",
      "Your work is scattered across GitHub, socials, and PDFs — nothing tells the story.",
      "Every new client does a search, and the first result shapes their first impression.",
    ],
    howItWorks: [
      {
        step: "Claim your name",
        detail:
          "Reserve your exact name slug so no one else can take it — and so your page exists where Google expects it.",
      },
      {
        step: "Build the story",
        detail:
          "Add a bio, photo, projects, and links. Import your GitHub, RSS, or YouTube so the page stays fresh automatically.",
      },
      {
        step: "Rank with intent",
        detail:
          "Your page ships SEO-engineered: semantic markup, structured data, fast static rendering, and hub-and-spoke sub-pages that ladder authority to your name.",
      },
    ],
    features: [
      "Free two-word name",
      "Imports (GitHub, RSS, YouTube)",
      "Sub-pages",
      "Name monitoring",
    ],
    demo: { label: "See a freelancer's page", path: "alex-rivera" },
  },
  {
    slug: "founders-executives",
    audience: "Founders & executives",
    tagline: "Control the story investors and press find about you",
    summary:
      "Own the #1 result for your name so recruiting, due diligence, and press see your version of the story.",
    outcome:
      "Investors, journalists, and future hires see the narrative you choose — not a rumor mill.",
    scenario:
      "A journalist searches your name before a profile piece; a candidate searches before accepting an offer.",
    challenges: [
      "Press mentions and third-party coverage rank above anything you control.",
      "A negative or outdated result shapes first impressions before you get a word in.",
      "Your LinkedIn is someone else's platform — you don't control its ranking or its rules.",
    ],
    howItWorks: [
      {
        step: "Claim your name",
        detail:
          "Take the exact-match result for your name, first-come-first-served — one-word names are a Premium perk.",
      },
      {
        step: "Lead with the narrative",
        detail:
          "Curate bio, links, and sub-pages (press kit, writing, portfolio) so the page reads the way you want to be introduced.",
      },
      {
        step: "Stay on top of it",
        detail:
          "Name monitoring alerts you the moment anyone new claims your name or a close variant, so the story never gets hijacked.",
      },
    ],
    features: ["One-word name (Premium)", "Name protection", "Monitoring alerts", "Custom domain"],
  },
  {
    slug: "creators-artists",
    audience: "Creators & artists",
    tagline: "Make your portfolio the #1 result, not a fan page",
    summary:
      "Rank your own site above socials, fan pages, and old profiles so every search lands on your best work.",
    outcome:
      "Every search for your name lands on your work — where the audience and the opportunities are.",
    scenario:
      "A fan, a curator, or a brand manager searches your name after seeing your work shared somewhere.",
    challenges: [
      "Social profiles and fan pages often outrank your own site for your name.",
      "Old projects stay online forever and tell an outdated story.",
      "You need one canonical home that collects links, work, and contact in one place.",
    ],
    howItWorks: [
      {
        step: "Claim your name",
        detail: "Secure the exact slug for your stage name or handle before anyone else does.",
      },
      {
        step: "Show the work",
        detail:
          "Sub-pages for portfolio and projects, plus imports from YouTube and RSS so new work appears automatically.",
      },
      {
        step: "Put it on your own domain",
        detail:
          "Premium unlocks a custom domain — your name, your URL, your rules — with canonical URLs that never compete.",
      },
    ],
    features: [
      "Free two-word name",
      "YouTube & RSS imports",
      "Custom domain (Premium)",
      "Directory listing",
    ],
  },
  {
    slug: "job-seekers",
    audience: "Job seekers",
    tagline: "Rank above LinkedIn and old profiles",
    summary:
      "Make hiring managers find your best self first — a crisp, current page instead of a stale profile.",
    outcome:
      "Recruiters see your strongest, most current self before anything outdated or accidental.",
    scenario:
      "A recruiter searches your name after your application lands in their inbox — and sees a 2018 profile.",
    challenges: [
      "LinkedIn and old social profiles dominate results for most names.",
      "You can't edit how you appear on third-party sites.",
      "A hiring manager's impression is formed in the first few results — often without you in them.",
    ],
    howItWorks: [
      {
        step: "Claim your name",
        detail: "Free for two-word names — the majority of job seekers' names qualify.",
      },
      {
        step: "Put your best foot forward",
        detail: "Resume sub-page, portfolio, and links to the profiles you actually want seen.",
      },
      {
        step: "Watch for variants",
        detail:
          "Monitoring alerts you if a lookalike claims your name or a close variant — so the search result stays yours.",
      },
    ],
    features: [
      "Free two-word name",
      "Resume sub-page",
      "Name monitoring",
      "Search Console analytics (Premium)",
    ],
  },
  {
    slug: "professionals-personal-brand",
    audience: "Professionals building a personal brand",
    tagline: "One home for everything you're known for",
    summary:
      "Consolidate your bio, writing, talks, and links into a single page that ranks — and gets found.",
    outcome:
      "One URL that ranks for your name and ties together every piece of your public identity.",
    scenario:
      "You publish, speak, and post — but anyone who searches you finds fragments, not a whole.",
    challenges: [
      "Your best content is spread across platforms you don't control.",
      "No single result captures the full picture of who you are and what you've done.",
      "Name collisions — someone with the same name — dilute your search results.",
    ],
    howItWorks: [
      {
        step: "Claim your name",
        detail: "First-come-first-served: claim the exact slug before a namesake does.",
      },
      {
        step: "Unify your presence",
        detail:
          "Import RSS, GitHub, and YouTube; add sub-pages for writing and talks; point your custom domain at it.",
      },
      {
        step: "Earn the ranking",
        detail:
          "Per-page Search Console analytics show which queries drive impressions — so you can double down.",
      },
    ],
    features: [
      "Imports (GitHub, RSS, YouTube)",
      "Sub-pages",
      "Custom domain (Premium)",
      "Search Console analytics (Premium)",
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return useCases.find((c) => c.slug === slug);
}
