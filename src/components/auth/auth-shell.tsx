import Link from "next/link";
import styles from "./auth.module.css";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.wordmark}>
        NamesRanker
      </Link>
      <h1 className={styles.title}>{title}</h1>
      {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      <div className={styles.body}>{children}</div>
    </main>
  );
}
