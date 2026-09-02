import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import { getUseCase, useCases } from "@/lib/usecases";
import styles from "./usecase.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return useCases.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = getUseCase(params.slug);
  if (!c) return {};
  return {
    title: `${c.audience} — NamesRanker`,
    description: c.summary,
  };
}

function ArrowIcon() {
  return (
    <svg
      className={styles.arrow}
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

export default function UseCasePage({ params }: { params: { slug: string } }) {
  const c = getUseCase(params.slug);
  if (!c) notFound();

  return (
    <main>
      <NavBar />
      <article className={styles.page}>
        <Link href="/usecases" className={styles.back}>
          ← All use cases
        </Link>

        <header className={styles.header}>
          <p className={styles.tag}>{c.audience}</p>
          <h1 className={styles.title}>{c.tagline}</h1>
          <p className={styles.outcome}>{c.outcome}</p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>The scenario</h2>
          <p className={styles.bodyText}>{c.scenario}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What usually goes wrong</h2>
          <ul className={styles.list}>
            {c.challenges.map((ch) => (
              <li key={ch} className={styles.listItem}>
                <span className={styles.bullet} aria-hidden="true" />
                {ch}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How NamesRanker fixes it</h2>
          <ol className={styles.steps}>
            {c.howItWorks.map((s, i) => (
              <li key={s.step} className={styles.step}>
                <span className={styles.stepNum}>{i + 1}</span>
                <div>
                  <h3 className={styles.stepTitle}>{s.step}</h3>
                  <p className={styles.bodyText}>{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What you get</h2>
          <div className={styles.chips}>
            {c.features.map((f) => (
              <span key={f} className={styles.chip}>
                {f}
              </span>
            ))}
          </div>
          {c.demo ? (
            <Link href={`/${c.demo.path}`} className={styles.demoLink}>
              {c.demo.label} <ArrowIcon />
            </Link>
          ) : null}
        </section>

        <div className={styles.cta}>
          <h2 className={styles.ctaTitle}>Start with your name — $1 for 7 full days.</h2>
          <Link href="/onboarding" className={styles.ctaButton}>
            Claim your name
          </Link>
        </div>
      </article>
      <Footer />
    </main>
  );
}
