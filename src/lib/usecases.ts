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
      "Your personal agent makes sure the first page a prospect sees for your name is you — your work, your voice, your latest wins.",
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
        step: "Your agent claims your name",
        detail:
          "It reserves your exact name and watches the variants, so nobody else can take the result people see for you.",
      },
      {
        step: "It builds from what you've done",
        detail:
          "Upload your resume and connect your blog, GitHub, or YouTube — your agent turns what you've already made into a footprint Google can rank.",
      },
      {
        step: "It publishes, pitches & tracks",
        detail:
          "Your agent syndicates your work across the platforms that matter for your field, pitches you to podcasts and publications, and tracks your rank until clients find you first.",
      },
    ],
    features: [
      "Your personal agent",
      "Imports (GitHub, RSS, YouTube)",
      "Publishing to your platforms",
      "Rank tracking & alerts",
    ],
    demo: { label: "See a freelancer's page", path: "alex-rivera" },
  },
  {
    slug: "founders-executives",
    audience: "Founders & executives",
    tagline: "Control the story investors and press find about you",
    summary:
      "Own the results for your name so recruiting, due diligence, and press see your version of the story — maintained for you, continuously.",
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
        step: "Your agent takes the exact match",
        detail:
          "Your name — even a one-word name — is claimed and protected so the definitive result can't be taken or squatted on.",
      },
      {
        step: "It leads with your narrative",
        detail:
          "From your resume, your agent builds the page the way you want to be introduced and keeps every profile across the web saying the same thing.",
      },
      {
        step: "It pitches your story outward",
        detail:
          "Podcasts, publications, and directories get a personalized pitch — drafted from your real record — so third parties start telling your story with links back to you.",
      },
    ],
    features: [
      "Your personal agent",
      "Pitching to press & podcasts",
      "Name protection",
      "Custom domain",
    ],
  },
  {
    slug: "creators-artists",
    audience: "Creators & artists",
    tagline: "Make your portfolio the #1 result, not a fan page",
    summary:
      "Your agent ranks your own work above socials, fan pages, and old profiles so every search lands on your best work.",
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
        step: "Your agent secures your name",
        detail: "It claims the exact slug for your stage name or handle before a fan page does.",
      },
      {
        step: "It shows the work everywhere",
        detail:
          "YouTube, RSS, and your platforms sync into your footprint, and your agent republishes your work (transformed, never duplicated) to the places your audience searches.",
      },
      {
        step: "It puts it on your own domain",
        detail:
          "Your custom domain hosts the definitive page — with canonical URLs that never compete, so all the authority lands on you.",
      },
    ],
    features: [
      "Your personal agent",
      "YouTube & RSS imports",
      "Publishing to your platforms",
      "Custom domain",
    ],
  },
  {
    slug: "job-seekers",
    audience: "Job seekers",
    tagline: "Rank above LinkedIn and old profiles",
    summary:
      "Make hiring managers find your best self first — a crisp, current, agent-maintained page instead of a stale profile.",
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
        step: "Your agent claims your name",
        detail:
          "Your exact slug is reserved, and your agent monitors close variants so the result stays yours.",
      },
      {
        step: "It puts your best foot forward",
        detail:
          "From your resume, your agent builds the page — experience, portfolio, links — and keeps it current as you update it.",
      },
      {
        step: "It makes you findable",
        detail:
          "Publishing and ranking tracking push your page above the stale profiles, and you watch the position move.",
      },
    ],
    features: [
      "Your personal agent",
      "Resume sub-page",
      "Name monitoring",
      "Rank tracking & alerts",
    ],
  },
  {
    slug: "professionals-personal-brand",
    audience: "Professionals building a personal brand",
    tagline: "One home for everything you're known for",
    summary:
      "Consolidate your bio, writing, talks, and links into one ranked identity — built and maintained by your agent.",
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
        step: "Your agent claims your name",
        detail: "The exact slug is yours first — before a namesake or squatter takes it.",
      },
      {
        step: "It unifies your presence",
        detail:
          "Resume, RSS, GitHub, YouTube — your agent assembles everything you've made into one consistent footprint and keeps every profile aligned.",
      },
      {
        step: "It earns the ranking",
        detail:
          "Syndication, pitches, and per-page search insights tell your agent what's working — so it doubles down until the whole is what ranks for your name.",
      },
    ],
    features: [
      "Your personal agent",
      "Imports (GitHub, RSS, YouTube)",
      "Publishing to your platforms",
      "Search Console insights",
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return useCases.find((c) => c.slug === slug);
}
