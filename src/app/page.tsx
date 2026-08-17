import Link from "next/link";
import styles from "./landing.module.css";
import { getScarcity, getDemoProfiles } from "@/lib/landing";

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

export default async function Home() {
  const [scarcity, demoProfiles] = await Promise.all([getScarcity(), getDemoProfiles()]);

  const availableCount = scarcity.filter((s) => s.status === "available").length;

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            Own the <em>#1 result</em> for your name.
          </h1>
          <p className={styles.heroSub}>
            NamesRanker builds you a searchable, SEO-engineered page so that when anyone Googles
            your name, your page — with your picture, work, and world — is the top result.
          </p>
          <div className={styles.heroCta}>
            <Link href="/onboarding" className={styles.ctaPrimary}>
              Claim your name
            </Link>
            <Link href="/names" className={styles.ctaSecondary}>
              Browse the directory
            </Link>
          </div>
          <p className={styles.heroNote}>Free for two-word names. One-word names are premium.</p>
        </div>
      </section>

      {/* Scarcity strip */}
      <section className={styles.scarcity}>
        <div className={styles.container}>
          <p className={styles.scarcityHeading}>{availableCount} names still available today</p>
          <ul className={styles.scarcityList}>
            {scarcity.map((entry) => (
              <li key={entry.slug} className={styles.scarcityItem}>
                <span className={styles.scarcityName}>{entry.name}</span>
                <span className={styles.scarcitySlug}>/{entry.slug}</span>
                <span className={`${styles.badge} ${styles[`badge_${entry.status}`]}`}>
                  {entry.status === "available"
                    ? "Available"
                    : entry.status === "premium"
                      ? "Premium"
                      : "Taken"}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/onboarding" className={styles.scarcityCta}>
            Claim yours before someone else does →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.how}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNum}>1</span>
              <h3>Claim your name</h3>
              <p>Enter your name and grab your unique URL before someone else does.</p>
            </li>
            <li>
              <span className={styles.stepNum}>2</span>
              <h3>Build your world</h3>
              <p>Add your bio, work, portfolio, links, and content in minutes.</p>
            </li>
            <li>
              <span className={styles.stepNum}>3</span>
              <h3>Rank on Google</h3>
              <p>Your SEO-engineered page works 24/7 to become the top result for your name.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Demo profiles */}
      <section className={styles.demos}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Made for every professional</h2>
          <div className={styles.demoGrid}>
            {demoProfiles.map((profile) => (
              <article key={profile.path} className={styles.demoCard}>
                {profile.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photoUrl} alt={profile.title} className={styles.demoPhoto} />
                ) : null}
                <div className={styles.demoBody}>
                  <h3>{profile.title}</h3>
                  <p className={styles.demoDesc}>{profile.descriptor}</p>
                  <p className={styles.demoBio}>{profile.bio}</p>
                  <p className={styles.demoSlug}>namesranker.com/{profile.path}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Simple pricing</h2>
          <div className={styles.priceGrid}>
            <div className={styles.priceCard}>
              <h3>Free</h3>
              <p className={styles.price}>$0</p>
              <ul>
                <li>Your hub page</li>
                <li>Two-word name slug</li>
                <li>Core sections</li>
              </ul>
              <Link href="/onboarding" className={styles.ctaPrimary}>
                Start free
              </Link>
            </div>
            <div className={`${styles.priceCard} ${styles.priceCardFeatured}`}>
              <h3>Premium</h3>
              <p className={styles.price}>$30/mo</p>
              <p className={styles.priceAlt}>$299/yr · $1,399 lifetime</p>
              <ul>
                <li>One-word name claim</li>
                <li>Name protection + monitoring</li>
                <li>Unlimited pages & sub-pages</li>
                <li>Custom domain & deep SEO</li>
              </ul>
              <Link href="/pricing" className={styles.ctaPrimary}>
                Go Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <h2 className={styles.finalCtaTitle}>Your name is searchable. Make it yours.</h2>
          <Link href="/onboarding" className={styles.ctaPrimary}>
            Claim your name
          </Link>
        </div>
      </section>
    </main>
  );
}
