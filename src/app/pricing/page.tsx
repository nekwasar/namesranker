import type { Metadata } from "next";
import Link from "next/link";
import CheckoutButtons from "./checkout-buttons";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "Pricing — NamesRanker",
  description: "Free + Premium plans. Own the #1 result for your name from $30/month.",
  alternates: { canonical: "/pricing" },
};

const INCLUDED = {
  free: ["Hub page", "Two-word name slug", "Core content sections", "Fast, indexed publishing"],
  freeNote: "Two-word names are always free",
};

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Own your name for one plan</h1>
        <p className={styles.sub}>
          Free forever for two-word names. Go Premium to claim a one-word name, protect it, and
          unlock the full engine.
        </p>
      </header>

      <section className={styles.free}>
        <h2 className={styles.freeTitle}>Free</h2>
        <p className={styles.freePrice}>$0</p>
        <p className={styles.freeAlt}>{INCLUDED.freeNote}</p>
        <ul className={styles.planList}>
          {INCLUDED.free.map((f) => (
            <li key={f} className={styles.planFeature}>
              {f}
            </li>
          ))}
        </ul>
        <Link href="/onboarding" className={styles.ctaGhost}>
          Start free
        </Link>
      </section>

      <CheckoutButtons />

      <section className={styles.notes}>
        <h2 className={styles.notesTitle}>Lapse policy</h2>
        <ul className={styles.notesList}>
          <li>Monthly: if it lapses, your one-word name is released immediately.</li>
          <li>Annual: you get a 30-day grace window before release.</li>
          <li>Lifetime: a one-time purchase, premium forever.</li>
          <li>Two-word and keyword slugs always stay yours.</li>
        </ul>
      </section>
    </main>
  );
}
