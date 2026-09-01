"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./nav.module.css";

const resourceColumns: { title: string; items: { href: string; label: string; desc: string }[] }[] =
  [
    {
      title: "Learn",
      items: [
        { href: "/blog", label: "Blog", desc: "Product news & SEO insights" },
        { href: "/usecases", label: "Use cases", desc: "Who it's for, with examples" },
        { href: "#how-it-works", label: "SEO guide", desc: "How your page ranks #1" },
      ],
    },
    {
      title: "Support",
      items: [
        { href: "/faq", label: "FAQ", desc: "Common questions, answered" },
        { href: "/names", label: "Name directory", desc: "Browse claimed names" },
        { href: "/pricing", label: "Premium", desc: "Features & pricing" },
      ],
    },
  ];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setResourcesOpen(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hover-intent: opening is instant; closing is delayed so the pointer
  // can travel from the trigger down into the mega menu without it vanishing
  // (there is a small visual gap between the bar and the fixed menu).
  function openResources() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setResourcesOpen(true);
  }

  function closeResourcesSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setResourcesOpen(false), 180);
  } // Close the menu whenever the route changes (after a link click navigates).
  useEffect(() => {
    setResourcesOpen(false);
  }, [pathname]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  // Close the mega menu on outside click / Escape.
  useEffect(() => {
    if (!resourcesOpen) return;
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node))
        setResourcesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setResourcesOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [resourcesOpen]);

  return (
    <header ref={headerRef} className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} onClick={() => setMobileOpen(false)}>
          <span className={styles.wordmark}>NamesRanker</span>
        </Link>

        <nav className={styles.links} aria-label="Primary">
          {/* Resources mega menu — opens on hover */}
          <div
            className={styles.item}
            onMouseEnter={openResources}
            onMouseLeave={closeResourcesSoon}
          >
            <button
              type="button"
              className={`${styles.trigger} ${resourcesOpen ? styles.active : ""}`}
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
              onClick={openResources}
            >
              Resources <span className={styles.caret} aria-hidden="true" />
            </button>
            {resourcesOpen ? (
              <div className={styles.mega} role="menu">
                <div className={styles.megaInner}>
                  {resourceColumns.map((col) => (
                    <div key={col.title} className={styles.megaColumn}>
                      <p className={styles.megaHeading}>{col.title}</p>
                      {col.items.map((l) => (
                        <Link
                          key={l.href + l.label}
                          href={l.href}
                          className={styles.menuItem}
                          onClick={() => setResourcesOpen(false)}
                        >
                          <span className={styles.menuLabel}>{l.label}</span>
                          <span className={styles.menuDesc}>{l.desc}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
                  <div className={styles.megaAside}>
                    <p className={styles.megaHeading}>Featured</p>
                    <p className={styles.asideText}>
                      Claim your name and rank #1 on Google — before someone else does.
                    </p>
                    <Link
                      href="/onboarding"
                      className={styles.asideCta}
                      onClick={() => setResourcesOpen(false)}
                    >
                      Claim your name →
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <Link href="/pricing" className={styles.link} onClick={() => setMobileOpen(false)}>
            Pricing
          </Link>
        </nav>

        <div className={styles.actions}>
          <Link href="/login" className={styles.login} onClick={() => setMobileOpen(false)}>
            Sign in
          </Link>
          <Link href="/onboarding" className={styles.cta} onClick={() => setMobileOpen(false)}>
            Claim your name
          </Link>
          <button
            type="button"
            className={styles.burger}
            aria-expanded={mobileOpen}
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className={styles.mobile}>
          <p className={styles.mobileHeading}>Resources</p>
          {resourceColumns
            .flatMap((c) => c.items)
            .map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                className={styles.mobileLink}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          <p className={styles.mobileHeading}>Company</p>
          <Link href="/pricing" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
            Pricing
          </Link>
          <Link href="/login" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className={styles.mobileCta}
            onClick={() => setMobileOpen(false)}
          >
            Claim your name
          </Link>
        </div>
      ) : null}
    </header>
  );
}
