import Link from "next/link";
import styles from "./member.module.css";

export type MemberSection = "chat" | "profile" | "settings";

const NAV: { href: string; label: string; key: MemberSection }[] = [
  { href: "/chat", label: "Your agent", key: "chat" },
  { href: "/profile", label: "Profile", key: "profile" },
  { href: "/settings", label: "Settings", key: "settings" },
];

export function MemberShell({
  active,
  email,
  children,
}: {
  active: MemberSection;
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            NamesRanker
          </Link>
          <nav className={styles.nav} aria-label="Your workspace">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`${styles.navLink} ${active === item.key ? styles.navActive : ""}`}
                aria-current={active === item.key ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.headerRight}>
            <span className={styles.email} title={email}>
              {email}
            </span>
            <Link href="/" className={styles.siteLink}>
              View site <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

/** Shared page scaffolding: title block + hairline-ruled sections. */
export function MemberPageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className={styles.pageHeader}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={styles.pageTitle}>{title}</h1>
      {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
    </header>
  );
}

export function MemberSectionBlock({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {description ? <p className={styles.sectionDesc}>{description}</p> : null}
        </div>
        {action ? <div className={styles.sectionAction}>{action}</div> : null}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}
