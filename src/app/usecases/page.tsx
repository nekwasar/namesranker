import Link from "next/link";
import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import { useCases } from "@/lib/usecases";
import styles from "./usecases.module.css";

export const metadata = {
  title: "Use cases — NamesRanker",
  description:
    "Who NamesRanker is for and how it helps freelancers, founders, creators, job seekers, and professionals rank #1 for their name.",
};

function ArrowIcon() {
  return (
    <svg
      className={styles.cardArrow}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default function UseCasesPage() {
  return (
    <main>
      <NavBar />
      <div className={styles.page}>
        <h1 className={styles.title}>Use cases</h1>
        <p className={styles.subtitle}>
          Anyone whose name gets searched — and who wants a personal agent ranking it. $1 for 7 full
          days, then $9/month.
        </p>
        <hr className={styles.rule} />

        <div className={styles.grid}>
          {useCases.map((c) => (
            <Link
              key={c.slug}
              href={`/usecases/${c.slug}`}
              className={styles.card}
              data-testid="usecase-card"
            >
              <div>
                <p className={styles.cardTag}>{c.audience}</p>
                <h2 className={styles.cardTitle}>{c.tagline}</h2>
                <p className={styles.cardSummary}>{c.summary}</p>
              </div>
              <div className={styles.cardFooter}>
                <span>Read the story</span>
                <ArrowIcon />
              </div>
            </Link>
          ))}
        </div>

        <div className={styles.cta}>
          <div>
            <h2 className={styles.ctaTitle}>Your name is being searched right now.</h2>
            <p className={styles.ctaSub}>
              Put a personal agent on it — it studies you, publishes your work, and tracks you to
              #1.
            </p>
          </div>
          <Link href="/onboarding" className={styles.ctaLink}>
            Claim your name
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
