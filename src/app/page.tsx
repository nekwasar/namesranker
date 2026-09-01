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
    "Searchable, SEO-engineered pages that rank your name first on Google. Claim your name before someone else does. Free for two-word names.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NamesRanker — Own the #1 result for your name",
    description: "Searchable, SEO-engineered pages that rank your name first on Google.",
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
  description: "Searchable, SEO-engineered pages that rank your name first on Google.",
};

const features = [
  {
    title: "Engineered to rank #1",
    body: "Clean semantic markup, fast ISR pages, and structured data tuned for personal-name queries.",
  },
  {
    title: "Claim your exact name",
    body: "Short, clean URL slugs allocated first-come, first-served. Two-word names are free.",
  },
  {
    title: "Build from one dashboard",
    body: "Bio, work, projects, testimonials, links and content — published and updated in minutes.",
  },
  {
    title: "Keyword variants",
    body: "Profession-tuned URL variants let you rank for both your name and what you do.",
  },
  {
    title: "Name monitoring",
    body: "Watch your top result and related competitor pages, with alerts on changes. (Premium)",
  },
  {
    title: "Protection from copycats",
    body: "We claim what's yours so impersonators and squatters can't take your search result. (Premium)",
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
              <h3>Claim your name</h3>
              <p>Enter your name and grab your unique URL before someone else does.</p>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNum}>02</span>
              <h3>Build your world</h3>
              <p>Add your bio, work, portfolio, links, and content in minutes.</p>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNum}>03</span>
              <h3>Rank on Google</h3>
              <p>Your SEO-engineered page works 24/7 to become the top result for your name.</p>
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
          <div className={styles.priceGrid}>
            <div className={`${styles.priceCard} ${styles.priceFeatureLevel}`}>
              <p className={styles.priceFeature}>Free</p>
            </div>
            <div className={styles.priceCard}>
              <h3 className={styles.priceName}>Free</h3>
              <p className={styles.price}>$0</p>
              <p className={styles.priceAlt}>forever · no credit card</p>
              <ul className={styles.priceList}>
                <li>Your hub page</li>
                <li>Two-word name slug</li>
                <li>Core content sections</li>
                <li>Fast, indexed publishing</li>
              </ul>
              <Link href="/onboarding" className={styles.ctaPrimary}>
                Start free
              </Link>
            </div>
            <div className={styles.priceCard}>
              <h3 className={styles.priceName}>Premium</h3>
              <p className={styles.price}>$30/mo</p>
              <p className={styles.priceAlt}>or $299/yr · $1,399 lifetime</p>
              <ul className={styles.priceList}>
                <li>One-word name claim</li>
                <li>Name protection + monitoring</li>
                <li>Unlimited pages & sub-pages</li>
                <li>Custom domain & deep SEO</li>
              </ul>
              <Link href="/pricing" className={styles.ctaPrimary}>
                Go Premium
              </Link>
            </div>
            <div className={`${styles.priceCard} ${styles.priceFeatureLevel}`}>
              <p className={styles.priceFeature}>Most popular</p>
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
          <h2 className={styles.finalCtaTitle}>Your name is searchable. Make it yours.</h2>
          <p className={styles.finalCtaSub}>
            Claim your name today and control the #1 result on Google — before someone else does.
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
