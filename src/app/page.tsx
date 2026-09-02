import Link from "next/link";
import styles from "./landing.module.css";
import { getScarcity, getDemoProfiles } from "@/lib/landing";
import { getRecentClaims } from "@/lib/claims/availability";
import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import Newsletter from "@/components/site/newsletter";
import { HeroSection } from "@/components/site/hero-demo";
import FAQ from "@/components/site/faq";

export const revalidate = 60;

export const metadata = {
  title: "NamesRanker — Own the #1 result for your name",
  description:
    "Your personal AI agent ranks your name on Google: it studies you from your resume, publishes your works across the web, pitches you to podcasts & publications, and tracks your rank. $1 for 7 full days.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NamesRanker — Own the #1 result for your name",
    description: "Your personal AI agent ranks your name on Google. $1 for 7 full days.",
    url: "https://namesranker.com",
    siteName: "NamesRanker",
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NamesRanker",
  url: "https://namesranker.com",
  description:
    "NamesRanker ranks your name on Google with a personal AI agent — studying, publishing, pitching, and tracking until you own the #1 result.",
};

const features = [
  {
    title: "Your personal agent",
    body: "Upload your resume and your agent takes over — it studies who you are and runs the whole ranking operation, reporting back in chat.",
  },
  {
    title: "Studied, not filled in",
    body: "No forms to grind through. Your resume becomes your footprint: your works, skills, and the queries people actually search to find you.",
  },
  {
    title: "Published for you",
    body: "Your agent transforms and syndicates your works across the platforms that matter for your profession — with your approval, never duplicated.",
  },
  {
    title: "Pitched for you",
    body: "Podcasts, guest posts, directories, journalists — your agent finds the opportunities, drafts the pitch, and sends it on your behalf.",
  },
  {
    title: "Rank tracking with proof",
    body: "Watch your name move on Google — baseline on day one, movement alerts as you climb, and a weekly report card in your chat.",
  },
  {
    title: "Nothing to babysit",
    body: "Ten minutes a week: approve batches, answer quick questions, watch the line move. The engine works while you sleep.",
  },
];

const testimonials = [
  {
    quote: "Within two weeks my page was the top result for my name — it opens doors before I do.",
    name: "Marcus T.",
    role: "Product Designer",
    slug: "marcus-taylor",
  },
  {
    quote: "A genuinely clean, fast page that outranks my LinkedIn. I control the story now.",
    name: "Priya R.",
    role: "Data Engineer",
    slug: "priya-ram",
  },
  {
    quote: "Recruiters tell me they found me through my page. That wasn't happening before.",
    name: "Daniel K.",
    role: "Freelance Developer",
    slug: "daniel-kim",
  },
];

export default async function Home() {
  const [scarcity, demoProfiles, recentClaims] = await Promise.all([
    getScarcity(),
    getDemoProfiles(),
    getRecentClaims(5),
  ]);

  const availableCount = scarcity.filter((s) => s.status === "available").length;

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <NavBar />

      {/* Hero — transparent, interactive demo to the right */}
      <section className={styles.hero}>
        <HeroSection />
      </section>

      {/* Social proof strip */}
      <section className={styles.strip}>
        <div className={styles.container}>
          <p className={styles.stripLabel}>Trusted as the top result for</p>
          <ul className={styles.stripRow}>
            {["Designers", "Engineers", "Founders", "Artists", "Researchers", "Consultants"].map(
              (s) => (
                <li key={s} className={styles.stripItem}>
                  {s}
                </li>
              )
            )}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section className={styles.section} id="features">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>
            Everything you need to <em>own your search result</em>
          </h2>
          <div className={styles.grid}>
            {features.map((f) => (
              <article key={f.title} className={styles.feature}>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureBody}>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.section} id="how-it-works">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <ol className={styles.steps}>
            <li className={styles.step}>
              <span className={styles.stepNum}>01</span>
              <h3>Meet your agent</h3>
              <p>
                Upload your resume — your personal agent studies it overnight and brings you a plan.
              </p>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNum}>02</span>
              <h3>It builds your footprint</h3>
              <p>
                Your agent publishes your works, keeps your identity consistent across the web, and
                pitches you — all with your one-tap approval.
              </p>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNum}>03</span>
              <h3>Watch yourself rank</h3>
              <p>
                Rank tracking, movement alerts, and a weekly report card — until the #1 result for
                your name is you.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* Examples / demo profiles */}
      <section className={styles.section} id="examples">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Made for every profession</h2>
          <div className={styles.demoList}>
            {demoProfiles.map((profile) => (
              <article key={profile.path} className={styles.demoRow}>
                <div className={styles.demoInfo}>
                  <h3>{profile.title}</h3>
                  <p className={styles.demoDesc}>{profile.descriptor}</p>
                  <p className={styles.demoBio}>{profile.bio}</p>
                  <a href={`/${profile.path}`} className={styles.demoLink}>
                    namesranker.com/{profile.path} →
                  </a>
                </div>
                {profile.projects.length > 0 ? (
                  <ul className={styles.demoProjects}>
                    {profile.projects.slice(0, 3).map((p) => (
                      <li key={p.title} className={styles.demoProject}>
                        <span className={styles.projectDot} aria-hidden="true" />
                        {p.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Scarcity */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.scarcityHeader}>
            <h2 className={styles.sectionTitle}>{availableCount} names still available today</h2>
            <Link href="/onboarding" className={styles.textLink}>
              Claim yours before someone else does →
            </Link>
          </div>
          <ul className={styles.scarcityList}>
            {scarcity.map((entry) => (
              <li key={entry.slug} className={styles.scarcityItem}>
                <span className={styles.scarcityName}>{entry.name}</span>
                <span className={styles.scarcitySlug}>/{entry.slug}</span>
                <span className={styles.badge}>
                  {entry.status === "available"
                    ? "Available"
                    : entry.status === "premium"
                      ? "Premium"
                      : "Taken"}
                </span>
              </li>
            ))}
          </ul>
          {recentClaims.length > 0 ? (
            <div className={styles.recent}>
              <p className={styles.recentHeading}>Claimed just now</p>
              <ul className={styles.recentList}>
                {recentClaims.map((claim) => (
                  <li key={claim.slug} className={styles.recentItem}>
                    <span className={styles.recentSlug}>/{claim.slug}</span>
                    <span className={styles.recentAgo}>{claim.ago}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>People own their results</h2>
          <div className={styles.quoteGrid}>
            {testimonials.map((t) => (
              <figure key={t.name} className={styles.quote}>
                <blockquote className={styles.quoteText}>“{t.quote}”</blockquote>
                <figcaption className={styles.quoteMeta}>
                  <span className={styles.quoteName}>{t.name}</span>
                  <span className={styles.quoteRole}>
                    {t.role} · /{t.slug}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.section} id="pricing">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Simple pricing</h2>
          <div
            className={styles.priceGrid}
            style={{ gridTemplateColumns: "repeat(1, minmax(0, 1fr))", maxWidth: 560 }}
          >
            <div className={`${styles.priceCard} ${styles.priceFeatureLevel}`}>
              <p className={styles.priceFeature}>Launch offer · $1 for 7 full days</p>
              <h3 className={styles.priceName}>Everything, no limits</h3>
              <p className={styles.price}>$9/mo</p>
              <p className={styles.priceAlt}>
                from day 8 · launch pricing · <s>$29/mo</s> after launch
              </p>
              <ul className={styles.priceList}>
                <li>Your personal ranking agent</li>
                <li>Resume in — footprint built for you</li>
                <li>Published & pitched across the web</li>
                <li>Rank tracking with movement alerts</li>
                <li>Cancel anytime — $1 refunded in-trial</li>
              </ul>
              <Link href="/onboarding" className={styles.ctaPrimary}>
                Start your $1 trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.section} id="faq">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Questions, answered</h2>
          <FAQ />
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <h2 className={styles.finalCtaTitle}>Your name is being searched right now.</h2>
          <p className={styles.finalCtaSub}>
            Your personal agent will make sure the answer is you — $1 for seven full days, then
            $9/month launch pricing.
          </p>
          <Link href="/onboarding" className={styles.ctaPrimary}>
            Claim your name
          </Link>
        </div>
      </section>

      {/* Newsletter */}
      <section className={styles.newsletter} data-testid="newsletter-section">
        <div className={styles.container}>
          <div className={styles.newsletterInner}>
            <div>
              <h2 className={styles.newsletterTitle}>Rank your name. It starts in your inbox.</h2>
              <p className={styles.newsletterSub}>
                One short email a month on claiming your name, winning your search result, and
                owning your presence. No noise.
              </p>
            </div>
            <Newsletter />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
