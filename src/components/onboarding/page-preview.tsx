"use client";

import type { PreviewData } from "@/lib/onboarding";
import styles from "./page-preview.module.css";

/**
 * Live hub-page preview shown beside every wizard step (spec §5.2:
 * "Every step … shows a live page preview so value is visible immediately").
 * Mirrors the public page layout ([...path]/page.tsx).
 */
export default function PagePreview({ draft }: { draft: PreviewData }) {
  return (
    <div className={styles.preview} data-testid="page-preview">
      <header className={styles.header}>
        {draft.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.photoUrl} alt="" className={styles.photo} />
        ) : null}
        <h3>{draft.name}</h3>
        {draft.descriptor ? <p className={styles.descriptor}>{draft.descriptor}</p> : null}
        <p className={styles.path}>namesranker.com/{draft.path}</p>
      </header>

      {draft.bio ? <p className={styles.bio}>{draft.bio}</p> : null}

      {draft.experience.length > 0 ? (
        <section className={styles.section}>
          <h4>Experience</h4>
          {draft.experience.map((e, i) => (
            <article key={i} className={styles.item}>
              <h5>{e.role}</h5>
              <p className={styles.muted}>
                {e.company}
                {e.location ? ` · ${e.location}` : ""}
                {e.start ? ` · ${e.start}${e.end ? `–${e.end}` : ""}` : ""}
              </p>
              {e.summary ? <p>{e.summary}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {draft.projects.length > 0 ? (
        <section className={styles.section}>
          <h4>Projects &amp; work</h4>
          {draft.projects.map((p, i) => (
            <article key={i} className={styles.item}>
              <h5>{p.title}</h5>
              {p.description ? <p>{p.description}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {draft.publications.length > 0 ? (
        <section className={styles.section}>
          <h4>Publications</h4>
          {draft.publications.map((p, i) => (
            <p key={i} className={styles.item}>
              <strong>{p.title}</strong>
              {p.publisher ? <span className={styles.muted}> · {p.publisher}</span> : ""}
            </p>
          ))}
        </section>
      ) : null}

      {draft.testimonials.length > 0 ? (
        <section className={styles.section}>
          <h4>What people say</h4>
          {draft.testimonials.map((t, i) => (
            <blockquote key={i} className={styles.quote}>
              “{t.quote}”
              {t.author ? (
                <footer className={styles.muted}>
                  — {t.author}
                  {t.role ? `, ${t.role}` : ""}
                </footer>
              ) : null}
            </blockquote>
          ))}
        </section>
      ) : null}

      {draft.socials.length > 0 ? (
        <ul className={styles.socials}>
          {draft.socials.map((s, i) => (
            <li key={i}>{s.platform}</li>
          ))}
        </ul>
      ) : null}

      {draft.connectors.length > 0 ? (
        <section className={styles.section}>
          <h4>Connected</h4>
          {draft.connectors.map((c, i) => (
            <p key={i} className={styles.item}>
              <strong>{c.type}</strong>
              <span className={styles.muted}> · {c.externalUrl}</span>
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}
