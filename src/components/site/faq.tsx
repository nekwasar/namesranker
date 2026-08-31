"use client";

import styles from "./faq.module.css";

const faqs = [
  {
    q: "Is my name really guaranteed to rank #1?",
    a: "NamesRanker builds an SEO-engineered page (clean semantic markup, fast ISR rendering, structured data, and careful internal linking) that we ladder up Google over time. Most single-name pages reach the first page within weeks; #1 is our target, not a contract. Two-word names are the easiest to rank — which is why those are free.",
  },
  {
    q: "What does it cost?",
    a: "Two-word names are free — claim yours and build your page at no cost. One-word names (think ‘Beyoncé’ or ‘Google’) and premium features like name protection, monitoring, unlimited sub-pages, and a custom domain are part of Premium.",
  },
  {
    q: "Why does claiming a name matter?",
    a: "There are limited clean, short slugs available, and we allocate them first-come, first-served. If someone else claims yourname and ranks it first, the search result for your name is theirs. Claim yours to control the #1 result.",
  },
  {
    q: "Can I bring my own domain?",
    a: "Yes. Premium unlocks a custom domain (including a short-branded vanity domain) so your page lives at a URL you fully own and control.",
  },
  {
    q: "How is my page published and updated?",
    a: "Your page is served statically for speed and SEO, and every edit you make revalidates it instantly. Changes to your content, links, and SEO settings appear on the live page immediately.",
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
