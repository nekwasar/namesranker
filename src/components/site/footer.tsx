import Link from "next/link";
import styles from "./footer.module.css";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/onboarding", label: "Claim your name" },
      { href: "/names", label: "Name directory" },
      { href: "#how-it-works", label: "How it works" },
      { href: "/pricing", label: "Premium" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/blog/authors", label: "Authors" },
      { href: "/usecases", label: "Use cases" },
      { href: "/faq", label: "FAQ" },
      { href: "/changelog", label: "Changelog" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.wordmark}>NamesRanker</span>
            <p className={styles.tagline}>
              The SEO-engineered page that ranks your name #1 on Google — before someone else claims
              it.
            </p>
            <p className={styles.mono}>namesranker.com/{`<your-name>`}</p>
          </div>

          <div className={styles.columns}>
            {columns.map((col) => (
              <nav key={col.title} className={styles.column} aria-label={col.title}>
                <h3 className={styles.heading}>{col.title}</h3>
                <ul className={styles.list}>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className={styles.link}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {new Date().getFullYear()} NamesRanker. All rights reserved.
          </p>
          <p className={styles.made}>NamesRanker · namesranker.com</p>
        </div>
      </div>
    </footer>
  );
}
