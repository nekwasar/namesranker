"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./admin.module.css";

type Tab = "pages" | "claims" | "imports" | "showcase" | "audit";

const TABS: { id: Tab; label: string }[] = [
  { id: "pages", label: "Pages" },
  { id: "claims", label: "Name disputes & claims" },
  { id: "imports", label: "Import review" },
  { id: "showcase", label: "Showcase" },
  { id: "audit", label: "Audit log" },
];

interface AdminPage {
  id: string;
  path: string;
  title: string;
  descriptor: string | null;
  status: string;
  isHub: boolean;
  createdAt: string;
  owner: { email: string } | null;
}

interface Claim {
  id: string;
  slug: string;
  wordCount: number;
  type: string;
  status: string;
  claimedAt: string;
  claimedBy: { email: string } | null;
}

interface ConnectorContent {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

interface Connector {
  id: string;
  type: string;
  externalUrl: string;
  contents: ConnectorContent[];
  page: { path: string; title: string } | null;
}

interface ShowcaseEntry {
  id: string;
  domain: string;
  path: string;
  status: string;
  createdAt: string;
  page: { path: string; title: string } | null;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: { path?: string; slug?: string; title?: string; note?: string; to?: string };
  createdAt: string;
  actor: { email: string } | null;
}

export default function AdminConsole() {
  const [tab, setTab] = useState<Tab>("pages");
  const [pages, setPages] = useState<AdminPage[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseEntry[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    const res = await fetch("/api/admin/pages");
    if (res.ok) setPages((await res.json()).pages);
  }, []);
  const loadClaims = useCallback(async () => {
    const res = await fetch("/api/admin/claims");
    if (res.ok) setClaims((await res.json()).claims);
  }, []);
  const loadImports = useCallback(async () => {
    const res = await fetch("/api/admin/imports");
    if (res.ok) setConnectors((await res.json()).connectors);
  }, []);
  const loadShowcase = useCallback(async () => {
    const res = await fetch("/api/admin/showcase");
    if (res.ok) setShowcase((await res.json()).entries);
  }, []);
  const loadAudit = useCallback(async () => {
    const res = await fetch("/api/admin/audit-logs");
    if (res.ok) setLogs((await res.json()).logs);
  }, []);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  function activate(next: Tab) {
    setTab(next);
    setError(null);
    if (next === "pages") void loadPages();
    if (next === "claims") void loadClaims();
    if (next === "imports") void loadImports();
    if (next === "showcase") void loadShowcase();
    if (next === "audit") void loadAudit();
  }
  async function act(url: string, body: Record<string, unknown>, refresh: (() => void) | null) {
    setError(null);
    setFlash(null);
    try {
      const { id, ...rest } = body;
      const target = id ? `${url}?id=${encodeURIComponent(String(id))}` : url;
      const res = await fetch(target, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Action failed");
        return;
      }
      setFlash("Done.");
      if (refresh) refresh();
    } catch {
      setError("Request failed");
    }
  }

  return (
    <div>
      {flash ? (
        <p className={styles.flash} role="status" data-testid="admin-flash">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert" data-testid="admin-error">
          {error}
        </p>
      ) : null}

      <nav className={styles.tabs} aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${tab === t.id ? styles.active : ""}`}
            onClick={() => activate(t.id)}
            data-testid={`admin-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "pages" ? <PagesTab pages={pages} act={act} reload={loadPages} /> : null}
      {tab === "claims" ? <ClaimsTab claims={claims} act={act} reload={loadClaims} /> : null}
      {tab === "imports" ? (
        <ImportsTab connectors={connectors} act={act} reload={loadImports} />
      ) : null}
      {tab === "showcase" ? (
        <ShowcaseTab entries={showcase} act={act} reload={loadShowcase} />
      ) : null}
      {tab === "audit" ? <AuditTab logs={logs} /> : null}
    </div>
  );
}

type Act = (
  url: string,
  body: Record<string, unknown>,
  refresh: (() => void) | null
) => Promise<void>;

function PagesTab({ pages, act, reload }: { pages: AdminPage[]; act: Act; reload: () => void }) {
  return (
    <section className={styles.section} data-testid="admin-pages">
      <h2 className={styles.sectionTitle}>Page approvals</h2>
      <p className={styles.hint}>
        Review pages awaiting approval, then publish or reject them. Approved pages go live and are
        revalidated.
      </p>
      {pages.length === 0 ? <p className={styles.empty}>No pages yet.</p> : null}
      <ul className={styles.list} data-testid="admin-page-list">
        {pages.map((p) => (
          <li key={p.id} className={styles.row} data-testid="admin-page">
            <div className={styles.rowMain}>
              <span className={styles.name}>
                {p.title} {p.isHub ? <em className={styles.muted}>(hub)</em> : null}
              </span>
              <span className={styles.muted}>
                /{p.path} · {p.owner?.email ?? "—"} · {p.descriptor ?? "no descriptor"}
              </span>
            </div>
            <span className={`${styles.badge} ${styles[p.status.toLowerCase()] ?? ""}`}>
              {p.status}
            </span>
            <div className={styles.actions}>
              {p.status !== "LIVE" ? (
                <button
                  type="button"
                  className={styles.primary}
                  data-testid={`admin-approve-${p.path}`}
                  onClick={() => void act("/api/admin/pages", { id: p.id, status: "LIVE" }, reload)}
                >
                  Approve
                </button>
              ) : null}
              {p.status !== "REJECTED" && p.status !== "LIVE" ? (
                <button
                  type="button"
                  className={styles.danger}
                  onClick={() =>
                    void act("/api/admin/pages", { id: p.id, status: "REJECTED" }, reload)
                  }
                >
                  Reject
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClaimsTab({ claims, act, reload }: { claims: Claim[]; act: Act; reload: () => void }) {
  return (
    <section className={styles.section} data-testid="admin-claims">
      <h2 className={styles.sectionTitle}>Name disputes & claim overrides</h2>
      <p className={styles.hint}>
        Release a disputed slug so another person can claim it, or override a claim&apos;s status.
        Every change is audited.
      </p>
      {claims.length === 0 ? <p className={styles.empty}>No claims yet.</p> : null}
      <ul className={styles.list} data-testid="admin-claim-list">
        {claims.map((c) => (
          <li key={c.id} className={styles.row} data-testid="admin-claim">
            <div className={styles.rowMain}>
              <span className={styles.name}>/{c.slug}</span>
              <span className={styles.muted}>
                {c.claimedBy?.email ?? "—"} · {c.type} · {c.wordCount} word(s)
              </span>
            </div>
            <span className={`${styles.badge} ${styles[c.status.toLowerCase()] ?? ""}`}>
              {c.status}
            </span>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.danger}
                data-testid={`admin-release-${c.slug}`}
                onClick={() =>
                  void act("/api/admin/claims", { action: "release", id: c.id }, reload)
                }
              >
                Release
              </button>
              <button
                type="button"
                className={styles.ghost}
                onClick={() =>
                  void act(
                    "/api/admin/claims",
                    { action: "override", id: c.id, status: "CLAIMED" },
                    reload
                  )
                }
              >
                Restore
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImportsTab({
  connectors,
  act,
  reload,
}: {
  connectors: Connector[];
  act: Act;
  reload: () => void;
}) {
  return (
    <section className={styles.section} data-testid="admin-imports">
      <h2 className={styles.sectionTitle}>Import review</h2>
      <p className={styles.hint}>
        Review connector content for spam. Deleting a post removes it from the page; the connector
        stays so the user can re-sync.
      </p>
      {connectors.length === 0 ? <p className={styles.empty}>No connectors yet.</p> : null}
      <ul className={styles.list} data-testid="admin-import-list">
        {connectors.map((c) => (
          <li key={c.id} className={styles.connector} data-testid="admin-connector">
            <div className={styles.rowMain}>
              <span className={styles.name}>
                {c.type} → {c.page?.path ?? "deleted page"}
              </span>
              <span className={styles.muted}>{c.externalUrl}</span>
            </div>
            {c.contents.length === 0 ? (
              <p className={styles.empty}>No imported content.</p>
            ) : (
              <ul className={styles.subList}>
                {c.contents.map((item) => (
                  <li key={item.id} className={styles.subRow} data-testid="admin-import-content">
                    <span>{item.title}</span>
                    <span className={styles.muted}>{item.url}</span>
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={() =>
                        void act(
                          "/api/admin/imports",
                          { action: "delete_content", contentId: item.id },
                          reload
                        )
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShowcaseTab({
  entries,
  act,
  reload,
}: {
  entries: ShowcaseEntry[];
  act: Act;
  reload: () => void;
}) {
  return (
    <section className={styles.section} data-testid="admin-showcase">
      <h2 className={styles.sectionTitle}>Showcase curation</h2>
      <p className={styles.hint}>
        ra-nk.me featured placements. Approve only content-active, genuinely useful pages.
      </p>
      {entries.length === 0 ? <p className={styles.empty}>No showcase entries yet.</p> : null}
      <ul className={styles.list} data-testid="admin-showcase-list">
        {entries.map((e) => (
          <li key={e.id} className={styles.row} data-testid="admin-showcase-entry">
            <div className={styles.rowMain}>
              <span className={styles.name}>
                {e.domain}/{e.path}
              </span>
              <span className={styles.muted}>
                {e.page?.title ?? "—"} · /{e.page?.path ?? "—"}
              </span>
            </div>
            <span className={`${styles.badge} ${styles[e.status.toLowerCase()] ?? ""}`}>
              {e.status}
            </span>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                data-testid={`admin-showcase-approve-${e.path}`}
                onClick={() =>
                  void act("/api/admin/showcase", { id: e.id, status: "LIVE" }, reload)
                }
              >
                Approve
              </button>
              <button
                type="button"
                className={styles.danger}
                onClick={() =>
                  void act("/api/admin/showcase", { id: e.id, status: "REJECTED" }, reload)
                }
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AuditTab({ logs }: { logs: AuditLog[] }) {
  return (
    <section className={styles.section} data-testid="admin-audit">
      <h2 className={styles.sectionTitle}>Audit log</h2>
      <p className={styles.hint}>Most recent moderation actions.</p>
      {logs.length === 0 ? <p className={styles.empty}>No audit entries yet.</p> : null}
      <ul className={styles.list} data-testid="admin-audit-list">
        {logs.map((l) => (
          <li key={l.id} className={styles.row} data-testid="admin-audit-entry">
            <div className={styles.rowMain}>
              <span className={styles.name}>{l.action}</span>
              <span className={styles.muted}>
                {l.actor?.email ?? "—"} · {l.entityType}
                {l.metadata?.slug
                  ? ` /${l.metadata.slug}`
                  : l.metadata?.path
                    ? ` /${l.metadata.path}`
                    : ""}
              </span>
            </div>
            <span className={styles.muted}>{new Date(l.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
