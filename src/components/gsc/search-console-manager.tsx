"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./search-console-manager.module.css";

interface GscLink {
  id: string;
  pageId: string;
  pagePath: string;
  pageTitle: string;
  propertyUrl: string;
  lastImportAt: string | null;
}

interface PageOption {
  id: string;
  path: string;
  title: string;
}

interface PanelState {
  rows: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  totals: { clicks: number; impressions: number; ctr: number; position: number };
}

export default function SearchConsoleManager({
  premium,
  initialLinks,
  pages,
}: {
  premium: boolean;
  initialLinks: GscLink[];
  pages: PageOption[];
}) {
  const [links, setLinks] = useState<GscLink[]>(initialLinks);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [activePanel, setActivePanel] = useState<Record<string, PanelState | "loading" | "error">>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    const res = await fetch("/api/settings/gsc");
    if (res.ok) setLinks((await res.json()).links);
  }, []);

  useEffect(() => {
    if (premium) void loadLinks();
  }, [premium, loadLinks]);

  if (!premium) {
    return (
      <section className={styles.wrapper} data-testid="gsc-upsell">
        <h2>Search Console</h2>
        <p className={styles.hint}>
          Connect Google Search Console to see your name&apos;s queries, impressions, and position —
          a premium feature.
        </p>
        <Link href="/pricing" className={styles.primaryButton}>
          Go Premium
        </Link>
      </section>
    );
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPage || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/gsc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: selectedPage }),
      });
      if (res.status === 403) {
        setError("Connecting Search Console requires premium.");
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError("Couldn't start the Google connection. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start the Google connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(link: GscLink) {
    setBusy(true);
    setError(null);
    try {
      await fetch(`/api/settings/gsc?id=${link.id}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      setActivePanel((prev) => {
        const next = { ...prev };
        delete next[link.id];
        return next;
      });
    } catch {
      setError("Couldn't disconnect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh(link: GscLink) {
    setActivePanel((prev) => ({ ...prev, [link.id]: "loading" }));
    setError(null);
    try {
      const res = await fetch(`/api/settings/gsc/${link.id}/refresh`, { method: "POST" });
      if (res.status === 403) {
        setActivePanel((prev) => ({ ...prev, [link.id]: "error" }));
        setError("Search Console access expired — please reconnect.");
        return;
      }
      if (!res.ok) {
        setActivePanel((prev) => ({ ...prev, [link.id]: "error" }));
        setError("Couldn't refresh analytics. Please try again.");
        return;
      }
      const data = (await res.json()) as { result: PanelState };
      setActivePanel((prev) => ({ ...prev, [link.id]: data.result }));
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, lastImportAt: new Date().toISOString() } : l))
      );
    } catch {
      setActivePanel((prev) => ({ ...prev, [link.id]: "error" }));
      setError("Couldn't refresh analytics. Please try again.");
    }
  }

  return (
    <section className={styles.wrapper} data-testid="gsc-manager">
      <h2>Search Console</h2>
      <p className={styles.hint}>
        See the exact queries, impressions, and position for your name&apos;s page in Google.
      </p>

      {error ? (
        <p className={styles.error} role="alert" data-testid="gsc-error">
          {error}
        </p>
      ) : null}

      <form onSubmit={connect} className={styles.form}>
        <select
          className={styles.select}
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          disabled={busy || pages.length === 0}
          data-testid="gsc-page-select"
        >
          <option value="">Select a page…</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              /{p.path} — {p.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={busy || !selectedPage}
          data-testid="gsc-connect"
        >
          {busy ? "Working…" : "Connect Google Search Console"}
        </button>
      </form>

      {links.length === 0 ? (
        <p className={styles.hint}>No Search Console accounts connected.</p>
      ) : null}

      <ul className={styles.list} data-testid="gsc-list">
        {links.map((link) => (
          <li key={link.id} className={styles.item} data-testid="gsc-link">
            <div className={styles.itemMain}>
              <span className={styles.name}>
                /{link.pagePath} — {link.pageTitle}
              </span>
              <span className={styles.muted}>
                {link.propertyUrl}
                {link.lastImportAt
                  ? ` · last updated ${new Date(link.lastImportAt).toLocaleDateString()}`
                  : " · not yet imported"}
              </span>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void refresh(link)}
                disabled={busy}
                data-testid={`gsc-refresh-${link.pagePath}`}
              >
                Refresh
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => void disconnect(link)}
                disabled={busy}
              >
                Disconnect
              </button>
            </div>

            {activePanel[link.id] === "loading" ? (
              <p className={styles.muted}>Loading analytics…</p>
            ) : activePanel[link.id] === "error" ? (
              <p className={styles.error}>Couldn&apos;t load analytics.</p>
            ) : activePanel[link.id] ? (
              <AnalyticsPanel state={activePanel[link.id] as unknown as PanelState} />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnalyticsPanel({ state }: { state: PanelState }) {
  const fmtCtr = (x: number) => `${(x * 100).toFixed(1)}%`;
  return (
    <div className={styles.panel} data-testid="gsc-panel">
      <div className={styles.totals}>
        <div className={styles.total}>
          <strong>{state.totals.clicks}</strong>
          <span>Clicks</span>
        </div>
        <div className={styles.total}>
          <strong>{state.totals.impressions}</strong>
          <span>Impressions</span>
        </div>
        <div className={styles.total}>
          <strong>{fmtCtr(state.totals.ctr)}</strong>
          <span>CTR</span>
        </div>
        <div className={styles.total}>
          <strong>{state.totals.position.toFixed(1)}</strong>
          <span>Avg position</span>
        </div>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Query</th>
            <th>Clicks</th>
            <th>Impr.</th>
            <th>CTR</th>
            <th>Pos.</th>
          </tr>
        </thead>
        <tbody>
          {state.rows.map((r, i) => (
            <tr key={i}>
              <td>{r.query}</td>
              <td>{r.clicks}</td>
              <td>{r.impressions}</td>
              <td>{fmtCtr(r.ctr)}</td>
              <td>{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
