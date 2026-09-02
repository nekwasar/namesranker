"use client";

import styles from "./faq.module.css";

const faqs = [
  {
    q: "How does NamesRanker actually rank my name?",
    a: "You upload your resume and your personal agent takes over: it studies who you are, builds a consistent identity web across the platforms that matter for your profession, publishes your works (transformed per platform, never duplicated), pitches you to podcasts and publications, and tracks your rank on Google — reporting back in chat, week after week.",
  },
  {
    q: "Do I have to do the work myself?",
    a: "No — that's the point. The agent does the studying, publishing, pitching, and tracking. Your job is about ten minutes a week: approve batches, answer quick questions, and watch the report card. Some actions need you (like pasting a post on LinkedIn, where platforms don't allow agents) — the agent prepares everything so it takes thirty seconds.",
  },
  {
    q: "What does it cost?",
    a: "$1 unlocks seven full days of everything — no limits. On day eight it auto-converts to the launch rate of $9/month (standard $29/month after launch). Cancel anytime during the trial and your $1 is refunded. There's no free plan, because a free tier couldn't honestly run an engine that ranks your name.",
  },
  {
    q: "Is my name really guaranteed to rank #1?",
    a: "No one can honestly guarantee a #1 ranking — but we run the full mechanism continuously: an SEO-engineered page, a consistent identity across the web, real published work, third-party placements, and live rank tracking. Most names reach the first page within weeks, and the engine keeps working until you're there.",
  },
  {
    q: "Do I need to create accounts on other platforms first?",
    a: "No. Your agent discovers the profiles you already have by studying your resume. Where a valuable profile is missing, it drafts everything from your resume and you complete the signup in about ninety seconds. We never create accounts for you.",
  },
];

export default function FAQ() {
  return (
    <div className={styles.list}>
      {faqs.map((f) => (
        <details key={f.q} className={styles.item}>
          <summary className={styles.question}>{f.q}</summary>
          <p className={styles.answer}>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
