import type { Metadata } from "next";
import Link from "next/link";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "Pricing — NamesRanker",
  description:
    "One plan. $1 for 7 full days of your personal ranking agent, then $9/month launch pricing (standard $29/month). Cancel anytime.",
  alternates: { canonical: "/pricing" },
};

const TRIAL_FEATURES = [
  "Your personal AI agent",
  "Resume in — footprint built for you",
  "Publishing across your platforms",
  "Pitches to podcasts & publications",
  "Rank tracking & movement alerts",
];

const PLAN_FEATURES = [
  "Your personal ranking agent",
  "Studied continuously: your works, skills & queries",
  "Publishing across the platforms that matter for your profession",
  "Pitching to podcasts, blogs & directories on your behalf",
  "Live rank tracking with alerts & a weekly report card",
  "Name monitoring & protection of close variants",
  "Custom domain on every page",
  "Everything inside the app — nothing to babysit",
];

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>One plan. Your name, ranked for you.</h1>
        <p className={styles.sub}>
          Your personal agent does the work: it studies you, publishes your works across the web,
          pitches you to podcasts and publications, and tracks your name on Google until it ranks.
        </p>
      </header>

      <section className={styles.free}>
        <h2 className={styles.freeTitle}>Launch offer · $1 for 7 full days</h2>
        <p className={styles.freePrice}>$1</p>
        <p className={styles.freeAlt}>
          Every feature, no limits, agent at full power. Day 8 auto-converts to{" "}
          <strong>$9/month</strong> launch pricing{" "}
          <span className={styles.was}>(standard $29/month after launch)</span>. Cancel during the
          trial and nothing further is charged.
        </p>
        <ul className={styles.planList}>
          {TRIAL_FEATURES.map((f) => (
            <li key={f} className={styles.planFeature}>
              {f}
            </li>
          ))}
        </ul>
        <Link href="/onboarding" className={styles.ctaGhost}>
          Start your $1 trial
        </Link>
      </section>

      <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 16 }}>
        <div className={`${styles.plan} ${styles.highlight}`}>
          <h3 className={styles.planName}>NamesRanker · every feature</h3>
          <p className={styles.planPrice}>
            $9<span className={styles.was}> /mo · $29</span>
          </p>
          <p className={styles.planAlt}>
            per month from day 8 · launch pricing for early members · no tiers, no limits
          </p>
          <ul className={styles.planList}>
            {PLAN_FEATURES.map((f) => (
              <li key={f} className={styles.planFeature}>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/onboarding" className={styles.cta}>
            Start your $1 trial
          </Link>
        </div>
      </div>

      <section className={styles.notes}>
        <h2 className={styles.notesTitle}>How the trial works</h2>
        <ul className={styles.notesList}>
          <li>$1 unlocks seven full days — every feature, no limits, nothing held back.</li>
          <li>
            On day 8 your membership auto-converts to $9/month (launch rate for early members).
          </li>
          <li>
            Cancel anytime during the trial — you&apos;ll never be charged the monthly rate and your
            $1 is refunded.
          </li>
          <li>After the launch window, new memberships are billed at the standard $29/month.</li>
          <li>
            Your data, page, and published work stay yours, whatever happens — export anytime.
          </li>
        </ul>
      </section>
    </main>
  );
}
