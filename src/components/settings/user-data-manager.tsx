"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SettingsData, SettingsPageData, ContentSection } from "@/lib/settings";
import type { ConnectorType } from "@/lib/onboarding";
import {
  computeSeoScore,
  countContentSignals,
  SEO_DESC_IDEAL_MAX,
  SEO_DESC_IDEAL_MIN,
  SEO_TITLE_IDEAL_MAX,
  SEO_TITLE_IDEAL_MIN,
} from "@/lib/seo";
import styles from "./user-data-manager.module.css";

export default function UserDataManager({
  premium,
  initial,
}: {
  premium: boolean;
  initial: SettingsData;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<SettingsPageData[]>(initial.pages);
  const [selectedId, setSelectedId] = useState(initial.pages[0]?.id ?? "");
  const page = pages.find((p) => p.id === selectedId) ?? pages[0] ?? null;

  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);
  const [seoDrafts, setSeoDrafts] = useState<Record<string, { title: string; desc: string }>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!initial.claim) {
    return (
      <div className={styles.empty}>
        <h2>Claim a name first</h2>
        <p>You need a claimed name before you can manage content.</p>
        <Link href="/onboarding" className={styles.primaryButton}>
          Claim your name
        </Link>
      </div>
    );
  }

  if (!page) {
    return (
      <div className={styles.empty}>
        <p>No page found. Finish onboarding to create your hub page.</p>
        <Link href="/onboarding" className={styles.primaryButton}>
          Continue onboarding
        </Link>
      </div>
    );
  }

  function updatePages(updater: (p: SettingsPageData) => SettingsPageData) {
    setPages((prev) => prev.map((p) => (p.id === page.id ? updater(p) : p)));
  }

  function patchContent(patch: Partial<SettingsPageData["content"]>) {
    updatePages((p) => ({ ...p, content: { ...p.content, ...patch } }));
  }

  async function saveSection(section: ContentSection, payload: Record<string, unknown>) {
    setBusy(section);
    setFlashError(null);
    try {
      const res = await fetch("/api/settings/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, section, data: payload }),
      });
      if (!res.ok) {
        setFlashError("Couldn't save this section. Please try again.");
        return;
      }
      const data = (await res.json()) as { seoScore: number };
      setFlash(`Saved — SEO score ${data.seoScore}/100`);
      updatePages((p) => ({ ...p, seoScore: data.seoScore }));
    } finally {
      setBusy(null);
    }
  }

  function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
    const target = index + dir;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    return next;
  }

  function seoDraftFor(p: SettingsPageData) {
    return seoDrafts[p.id] ?? { title: p.metaTitle ?? "", desc: p.metaDescription ?? "" };
  }

  function liveSeoScore(p: SettingsPageData): number {
    const draft = seoDraftFor(p);
    return computeSeoScore({
      metaTitle: draft.title,
      metaDescription: draft.desc,
      descriptor: p.descriptor,
      contentSignals: countContentSignals({
        descriptor: p.descriptor,
        bio: p.content.bio,
        socials: p.content.socials,
        experience: p.content.experience,
        projects: p.content.projects,
        publications: p.content.publications,
        testimonials: p.content.testimonials,
      }),
    });
  }

  const hubPages = pages.filter((p) => p.isHub);
  const subPages = pages.filter((p) => !p.isHub);

  return (
    <div className={styles.manager}>
      {flash ? (
        <p className={styles.flash} data-testid="save-flash" role="status">
          {flash}
        </p>
      ) : null}
      {flashError ? (
        <p className={styles.error} role="alert">
          {flashError}
        </p>
      ) : null}

      {/* Page selector */}
      {pages.length > 1 ? (
        <div className={styles.pageTabs} data-testid="page-tabs">
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.pageTab} ${p.id === page.id ? styles.active : ""}`}
              onClick={() => setSelectedId(p.id)}
            >
              {p.isHub ? "Hub" : `/${p.path.split("/").pop()}`}
            </button>
          ))}
        </div>
      ) : null}

      <p className={styles.pagePath}>Editing: /{page.path}</p>

      {/* Profile */}
      <Section title="Profile" hint="Headline, photo, and bio.">
        <label className={styles.label} htmlFor="settings-descriptor">
          Headline (profession · location)
        </label>
        <input
          id="settings-descriptor"
          data-testid="settings-descriptor"
          className={styles.input}
          value={page.content.bio === undefined ? "" : (page.descriptor ?? "")}
          onChange={(e) => updatePages((p) => ({ ...p, descriptor: e.target.value }))}
          placeholder="Product Designer · Austin, TX"
        />
        <label className={styles.label} htmlFor="settings-photo">
          Profile photo URL
        </label>
        <input
          id="settings-photo"
          data-testid="settings-photo"
          className={styles.input}
          type="url"
          value={page.content.photoUrl ?? ""}
          onChange={(e) => patchContent({ photoUrl: e.target.value })}
          placeholder="https://…"
        />
        <label className={styles.label} htmlFor="settings-bio">
          Bio
        </label>
        <textarea
          id="settings-bio"
          data-testid="settings-bio"
          className={styles.textarea}
          rows={4}
          value={page.content.bio ?? ""}
          onChange={(e) => patchContent({ bio: e.target.value })}
          placeholder="Who are you?"
        />
        <SaveButton
          label="Save profile"
          testid="save-profile"
          busy={busy === "profile"}
          onSave={() =>
            saveSection("profile", {
              descriptor: page.descriptor,
              photoUrl: page.content.photoUrl,
              bio: page.content.bio,
            })
          }
        />
      </Section>

      {/* Socials */}
      <Section title="Links & socials" hint="Your real footprint — proof for Google.">
        {page.content.socials.map((s, i) => (
          <div key={i} className={styles.row}>
            <input
              data-testid={`settings-social-platform-${i}`}
              className={styles.input}
              value={s.platform}
              placeholder="Platform"
              onChange={(e) =>
                patchContent({
                  socials: page.content.socials.map((x, j) =>
                    j === i ? { ...x, platform: e.target.value } : x
                  ),
                })
              }
            />
            <input
              data-testid={`settings-social-url-${i}`}
              className={styles.input}
              type="url"
              value={s.url}
              placeholder="https://…"
              onChange={(e) =>
                patchContent({
                  socials: page.content.socials.map((x, j) =>
                    j === i ? { ...x, url: e.target.value } : x
                  ),
                })
              }
            />
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() =>
                patchContent({ socials: page.content.socials.filter((_, j) => j !== i) })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() =>
            patchContent({ socials: [...page.content.socials, { platform: "", url: "" }] })
          }
        >
          + Add link
        </button>
        <SaveButton
          label="Save links"
          testid="save-socials"
          busy={busy === "socials"}
          onSave={() => saveSection("socials", { links: page.content.socials })}
        />
      </Section>

      {/* Experience */}
      <Section title="Experience" hint="Your work history.">
        {page.content.experience.map((e, i) => (
          <div key={i} className={styles.entry} data-testid="settings-experience-row">
            <div className={styles.entryHeader}>
              <input
                data-testid={`settings-experience-role-${i}`}
                className={styles.input}
                value={e.role}
                placeholder="Role"
                onChange={(ev) =>
                  patchContent({
                    experience: page.content.experience.map((x, j) =>
                      j === i ? { ...x, role: ev.target.value } : x
                    ),
                  })
                }
              />
              <ReorderButtons
                canUp={i > 0}
                canDown={i < page.content.experience.length - 1}
                onUp={() =>
                  patchContent({
                    experience: moveItem(page.content.experience, i, -1),
                  })
                }
                onDown={() =>
                  patchContent({
                    experience: moveItem(page.content.experience, i, 1),
                  })
                }
                onRemove={() =>
                  patchContent({
                    experience: page.content.experience.filter((_, j) => j !== i),
                  })
                }
              />
            </div>
            <input
              className={styles.input}
              value={e.company ?? ""}
              placeholder="Company"
              onChange={(ev) =>
                patchContent({
                  experience: page.content.experience.map((x, j) =>
                    j === i ? { ...x, company: ev.target.value } : x
                  ),
                })
              }
            />
            <div className={styles.row}>
              <input
                className={styles.input}
                value={e.location ?? ""}
                placeholder="Location"
                onChange={(ev) =>
                  patchContent({
                    experience: page.content.experience.map((x, j) =>
                      j === i ? { ...x, location: ev.target.value } : x
                    ),
                  })
                }
              />
              <input
                className={styles.input}
                value={e.start ?? ""}
                placeholder="Start"
                onChange={(ev) =>
                  patchContent({
                    experience: page.content.experience.map((x, j) =>
                      j === i ? { ...x, start: ev.target.value } : x
                    ),
                  })
                }
              />
              <input
                className={styles.input}
                value={e.end ?? ""}
                placeholder="End"
                onChange={(ev) =>
                  patchContent({
                    experience: page.content.experience.map((x, j) =>
                      j === i ? { ...x, end: ev.target.value } : x
                    ),
                  })
                }
              />
            </div>
            <textarea
              className={styles.textarea}
              rows={2}
              value={e.summary ?? ""}
              placeholder="One-line summary"
              onChange={(ev) =>
                patchContent({
                  experience: page.content.experience.map((x, j) =>
                    j === i ? { ...x, summary: ev.target.value } : x
                  ),
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() =>
            patchContent({
              experience: [...page.content.experience, { role: "", company: "" }],
            })
          }
        >
          + Add role
        </button>
        <SaveButton
          label="Save experience"
          testid="save-experience"
          busy={busy === "experience"}
          onSave={() => saveSection("experience", { experience: page.content.experience })}
        />
      </Section>

      {/* Projects */}
      <Section title="Projects & work" hint="The things you've built.">
        {page.content.projects.map((p, i) => (
          <div key={i} className={styles.entry} data-testid="settings-project-row">
            <div className={styles.entryHeader}>
              <input
                data-testid={`settings-project-title-${i}`}
                className={styles.input}
                value={p.title}
                placeholder="Project title"
                onChange={(ev) =>
                  patchContent({
                    projects: page.content.projects.map((x, j) =>
                      j === i ? { ...x, title: ev.target.value } : x
                    ),
                  })
                }
              />
              <ReorderButtons
                canUp={i > 0}
                canDown={i < page.content.projects.length - 1}
                onUp={() => patchContent({ projects: moveItem(page.content.projects, i, -1) })}
                onDown={() => patchContent({ projects: moveItem(page.content.projects, i, 1) })}
                onRemove={() =>
                  patchContent({ projects: page.content.projects.filter((_, j) => j !== i) })
                }
              />
            </div>
            <input
              className={styles.input}
              value={p.description ?? ""}
              placeholder="What is it?"
              onChange={(ev) =>
                patchContent({
                  projects: page.content.projects.map((x, j) =>
                    j === i ? { ...x, description: ev.target.value } : x
                  ),
                })
              }
            />
            <input
              className={styles.input}
              type="url"
              value={p.url ?? ""}
              placeholder="https://…"
              onChange={(ev) =>
                patchContent({
                  projects: page.content.projects.map((x, j) =>
                    j === i ? { ...x, url: ev.target.value } : x
                  ),
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => patchContent({ projects: [...page.content.projects, { title: "" }] })}
        >
          + Add project
        </button>
        <SaveButton
          label="Save projects"
          testid="save-projects"
          busy={busy === "projects"}
          onSave={() => saveSection("projects", { projects: page.content.projects })}
        />
      </Section>

      {/* Publications */}
      <Section title="Publications" hint="Articles, talks, and writing.">
        {page.content.publications.map((pub, i) => (
          <div key={i} className={styles.entry} data-testid="settings-publication-row">
            <div className={styles.entryHeader}>
              <input
                data-testid={`settings-publication-title-${i}`}
                className={styles.input}
                value={pub.title}
                placeholder="Title"
                onChange={(ev) =>
                  patchContent({
                    publications: page.content.publications.map((x, j) =>
                      j === i ? { ...x, title: ev.target.value } : x
                    ),
                  })
                }
              />
              <ReorderButtons
                canUp={i > 0}
                canDown={i < page.content.publications.length - 1}
                onUp={() =>
                  patchContent({ publications: moveItem(page.content.publications, i, -1) })
                }
                onDown={() =>
                  patchContent({ publications: moveItem(page.content.publications, i, 1) })
                }
                onRemove={() =>
                  patchContent({
                    publications: page.content.publications.filter((_, j) => j !== i),
                  })
                }
              />
            </div>
            <input
              className={styles.input}
              type="url"
              value={pub.url ?? ""}
              placeholder="https://…"
              onChange={(ev) =>
                patchContent({
                  publications: page.content.publications.map((x, j) =>
                    j === i ? { ...x, url: ev.target.value } : x
                  ),
                })
              }
            />
            <input
              className={styles.input}
              value={pub.publisher ?? ""}
              placeholder="Publisher"
              onChange={(ev) =>
                patchContent({
                  publications: page.content.publications.map((x, j) =>
                    j === i ? { ...x, publisher: ev.target.value } : x
                  ),
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() =>
            patchContent({ publications: [...page.content.publications, { title: "" }] })
          }
        >
          + Add publication
        </button>
        <SaveButton
          label="Save publications"
          testid="save-publications"
          busy={busy === "publications"}
          onSave={() => saveSection("publications", { publications: page.content.publications })}
        />
      </Section>

      {/* Testimonials */}
      <Section title="Testimonials" hint="Proof from people who've worked with you.">
        {page.content.testimonials.map((t, i) => (
          <div key={i} className={styles.entry} data-testid="settings-testimonial-row">
            <div className={styles.entryHeader}>
              <textarea
                className={styles.textarea}
                rows={2}
                value={t.quote}
                placeholder="“What did they say?”"
                onChange={(ev) =>
                  patchContent({
                    testimonials: page.content.testimonials.map((x, j) =>
                      j === i ? { ...x, quote: ev.target.value } : x
                    ),
                  })
                }
              />
              <ReorderButtons
                canUp={i > 0}
                canDown={i < page.content.testimonials.length - 1}
                onUp={() =>
                  patchContent({ testimonials: moveItem(page.content.testimonials, i, -1) })
                }
                onDown={() =>
                  patchContent({ testimonials: moveItem(page.content.testimonials, i, 1) })
                }
                onRemove={() =>
                  patchContent({
                    testimonials: page.content.testimonials.filter((_, j) => j !== i),
                  })
                }
              />
            </div>
            <input
              className={styles.input}
              value={t.author ?? ""}
              placeholder="Author"
              onChange={(ev) =>
                patchContent({
                  testimonials: page.content.testimonials.map((x, j) =>
                    j === i ? { ...x, author: ev.target.value } : x
                  ),
                })
              }
            />
            <input
              className={styles.input}
              value={t.role ?? ""}
              placeholder="Their role"
              onChange={(ev) =>
                patchContent({
                  testimonials: page.content.testimonials.map((x, j) =>
                    j === i ? { ...x, role: ev.target.value } : x
                  ),
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() =>
            patchContent({ testimonials: [...page.content.testimonials, { quote: "" }] })
          }
        >
          + Add testimonial
        </button>
        <SaveButton
          label="Save testimonials"
          testid="save-testimonials"
          busy={busy === "testimonials"}
          onSave={() => saveSection("testimonials", { testimonials: page.content.testimonials })}
        />
      </Section>

      {/* SEO editor */}
      <SeoEditor
        page={page}
        draft={seoDraftFor(page)}
        liveScore={liveSeoScore(page)}
        busy={busy === "seo"}
        onDraft={(d) => setSeoDrafts((prev) => ({ ...prev, [page.id]: d }))}
        onSave={async () => {
          setBusy("seo");
          setFlashError(null);
          try {
            const res = await fetch("/api/settings/seo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pageId: page.id,
                metaTitle: seoDraftFor(page).title,
                metaDescription: seoDraftFor(page).desc,
              }),
            });
            if (!res.ok) {
              setFlashError("Couldn't save SEO settings.");
              return;
            }
            const data = (await res.json()) as { seoScore: number };
            setFlash(`SEO saved — score ${data.seoScore}/100`);
            updatePages((p) => ({ ...p, seoScore: data.seoScore }));
          } finally {
            setBusy(null);
          }
        }}
      />

      {/* Connectors */}
      <ConnectorsSection
        page={page}
        onBusy={setBusy}
        onFlash={(msg) => setFlash(msg)}
        onError={(msg) => setFlashError(msg)}
        onChanged={(connectors) => updatePages((p) => ({ ...p, connectors }))}
      />

      {/* Sub-pages */}
      <SubPagesSection
        premium={premium}
        hub={hubPages[0]}
        subPages={subPages}
        busy={busy}
        onBusy={setBusy}
        onFlash={setFlash}
        onError={setFlashError}
        onCreated={(p) => {
          setPages((prev) => [...prev, p]);
          setSelectedId(p.id);
        }}
        onChanged={(updated) => {
          setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
        onDeleted={(id) => {
          setPages((prev) => {
            const next = prev.filter((p) => p.id !== id);
            if (selectedId === id) setSelectedId(next[0]?.id ?? "");
            return next;
          });
        }}
      />

      {/* GDPR */}
      <Section title="Account & data" hint="GDPR export and deletion.">
        <div className={styles.row}>
          <a className={styles.primaryButton} href="/api/settings/export" data-testid="export-data">
            Export my data (JSON)
          </a>
          {!confirmDelete ? (
            <button
              type="button"
              className={styles.dangerButton}
              data-testid="delete-account"
              onClick={() => setConfirmDelete(true)}
            >
              Delete my account
            </button>
          ) : (
            <div className={styles.row} data-testid="delete-confirm">
              <span className={styles.hint}>
                This permanently deletes your page, name claim, and all data.
              </span>
              <button
                type="button"
                className={styles.dangerButton}
                data-testid="delete-confirm-yes"
                onClick={async () => {
                  setBusy("delete");
                  try {
                    const res = await fetch("/api/settings/delete", { method: "POST" });
                    if (res.ok) router.push("/");
                    else setFlashError("Couldn't delete your account. Please try again.");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Yes, delete everything
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

/* ---------- small building blocks ---------- */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={styles.section}
      data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <h2>{title}</h2>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function SaveButton({
  label,
  testid,
  busy,
  onSave,
}: {
  label: string;
  testid: string;
  busy: boolean;
  onSave: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.primaryButton}
      data-testid={testid}
      disabled={busy}
      onClick={onSave}
    >
      {busy ? "Saving…" : label}
    </button>
  );
}

function ReorderButtons({
  canUp,
  canDown,
  onUp,
  onDown,
  onRemove,
}: {
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.reorder}>
      <button
        type="button"
        className={styles.reorderButton}
        disabled={!canUp}
        onClick={onUp}
        title="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        className={styles.reorderButton}
        disabled={!canDown}
        onClick={onDown}
        title="Move down"
      >
        ↓
      </button>
      <button type="button" className={styles.reorderButton} onClick={onRemove} title="Remove">
        ✕
      </button>
    </div>
  );
}

function SeoEditor({
  page,
  draft,
  liveScore,
  busy,
  onDraft,
  onSave,
}: {
  page: SettingsPageData;
  draft: { title: string; desc: string };
  liveScore: number;
  busy: boolean;
  onDraft: (d: { title: string; desc: string }) => void;
  onSave: () => void;
}) {
  const titleLen = draft.title.length;
  const descLen = draft.desc.length;
  return (
    <section className={styles.section} data-testid="section-seo-editor">
      <h2>SEO editor</h2>
      <p className={styles.hint}>How your page appears on Google — per page.</p>

      <div className={styles.serp} data-testid="serp-preview">
        <p className={styles.serpTitle}>{draft.title || "Your page title appears here"}</p>
        <p className={styles.serpUrl}>namesranker.com/{page.path}</p>
        <p className={styles.serpDesc}>
          {draft.desc || "Your meta description appears here — write 70–160 characters."}
        </p>
      </div>

      <div className={styles.scoreRow}>
        <span className={styles.scoreLabel}>SEO score</span>
        <span className={styles.scoreValue} data-testid="seo-score">
          {liveScore}/100
        </span>
        <div className={styles.scoreBar}>
          <div className={styles.scoreFill} style={{ width: `${liveScore}%` }} />
        </div>
      </div>

      <label className={styles.label} htmlFor="meta-title">
        Meta title{" "}
        <span className={styles.charCount}>
          ({titleLen} chars — ideal {SEO_TITLE_IDEAL_MIN}–{SEO_TITLE_IDEAL_MAX})
        </span>
      </label>
      <input
        id="meta-title"
        data-testid="meta-title"
        className={styles.input}
        value={draft.title}
        maxLength={200}
        onChange={(e) => onDraft({ ...draft, title: e.target.value })}
        placeholder="Alex Rivera — Product Designer in Austin"
      />
      <label className={styles.label} htmlFor="meta-desc">
        Meta description{" "}
        <span className={styles.charCount}>
          ({descLen} chars — ideal {SEO_DESC_IDEAL_MIN}–{SEO_DESC_IDEAL_MAX})
        </span>
      </label>
      <textarea
        id="meta-desc"
        data-testid="meta-description"
        className={styles.textarea}
        rows={3}
        value={draft.desc}
        maxLength={400}
        onChange={(e) => onDraft({ ...draft, desc: e.target.value })}
        placeholder="Alex Rivera is a product designer in Austin specializing in design systems…"
      />
      <SaveButton label="Save SEO" testid="save-seo" busy={busy} onSave={onSave} />
    </section>
  );
}

function ConnectorsSection({
  page,
  onBusy,
  onFlash,
  onError,
  onChanged,
}: {
  page: SettingsPageData;
  onBusy: (v: string | null) => void;
  onFlash: (msg: string) => void;
  onError: (msg: string) => void;
  onChanged: (connectors: SettingsPageData["connectors"]) => void;
}) {
  const [type, setType] = useState<ConnectorType>("RSS");
  const [url, setUrl] = useState("");

  async function add() {
    if (!url.trim()) return;
    onBusy("connector");
    onError("");
    try {
      const res = await fetch("/api/settings/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, type, externalUrl: url.trim() }),
      });
      if (!res.ok) {
        onError("Couldn't add connector (max 3 per page).");
        return;
      }
      const data = (await res.json()) as { connector: SettingsPageData["connectors"][number] };
      onChanged([...page.connectors, data.connector]);
      setUrl("");
      onFlash("Connector added — fetching imports arrives with import connectors (M7).");
    } finally {
      onBusy(null);
    }
  }

  async function remove(id: string) {
    onBusy("connector");
    onError("");
    try {
      const res = await fetch(`/api/settings/connectors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        onError("Couldn't remove connector.");
        return;
      }
      onChanged(page.connectors.filter((c) => c.id !== id));
    } finally {
      onBusy(null);
    }
  }

  return (
    <section className={styles.section} data-testid="section-connectors">
      <h2>Import connectors</h2>
      <p className={styles.hint}>
        Pull your blog, GitHub, or YouTube onto the page. Free accounts sync manually; premium
        auto-syncs. The fetch engine itself arrives with import connectors (M7).
      </p>
      {page.connectors.length === 0 ? (
        <p className={styles.hint}>No connectors yet.</p>
      ) : (
        <ul className={styles.list} data-testid="connector-list">
          {page.connectors.map((c) => (
            <li key={c.id} className={styles.listItem} data-testid="connector-row">
              <span>
                <strong>{c.type}</strong> · {c.externalUrl}
              </span>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => void remove(c.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.row}>
        <select
          className={styles.input}
          value={type}
          data-testid="connector-type"
          onChange={(e) => setType(e.target.value as ConnectorType)}
        >
          <option value="RSS">RSS</option>
          <option value="GITHUB">GitHub</option>
          <option value="YOUTUBE">YouTube</option>
        </select>
        <input
          className={styles.input}
          type="url"
          value={url}
          data-testid="connector-url"
          placeholder="https://…"
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="connector-add"
          onClick={() => void add()}
        >
          Add
        </button>
      </div>
    </section>
  );
}

function SubPagesSection({
  premium,
  hub,
  subPages,
  busy,
  onBusy,
  onFlash,
  onError,
  onCreated,
  onChanged,
  onDeleted,
}: {
  premium: boolean;
  hub?: SettingsPageData;
  subPages: SettingsPageData[];
  busy: string | null;
  onBusy: (v: string | null) => void;
  onFlash: (msg: string) => void;
  onError: (msg: string) => void;
  onCreated: (p: SettingsPageData) => void;
  onChanged: (p: SettingsPageData) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [segment, setSegment] = useState("");

  async function create() {
    if (!title.trim() || !segment.trim()) return;
    onBusy("subpage");
    onError("");
    try {
      const res = await fetch("/api/settings/subpages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), segment: segment.trim() }),
      });
      if (!res.ok) {
        onError(
          "Couldn't create sub-page — check the segment (lowercase, hyphens) or it may already exist."
        );
        return;
      }
      const data = (await res.json()) as { page: SettingsPageData };
      onCreated(data.page);
      setTitle("");
      setSegment("");
      onFlash("Sub-page created and live.");
    } finally {
      onBusy(null);
    }
  }

  return (
    <section className={styles.section} data-testid="section-subpages">
      <h2>Sub-pages</h2>
      <p className={styles.hint}>
        Supporting pages under your name that target related keywords (e.g. /
        {hub?.path ?? "your-name"}/portfolio). Premium feature.
      </p>

      {!premium ? (
        <div data-testid="subpage-upsell">
          <p className={styles.hint}>
            Sub-pages are premium — upgrade to add more pages and rank for more keywords.
          </p>
          <Link href="/pricing" className={styles.primaryButton}>
            Go Premium
          </Link>
        </div>
      ) : (
        <>
          {subPages.length === 0 ? (
            <p className={styles.hint}>No sub-pages yet.</p>
          ) : (
            <ul className={styles.list} data-testid="subpage-list">
              {subPages.map((sp) => (
                <SubPageRow
                  key={sp.id}
                  page={sp}
                  busy={busy === `subpage-${sp.id}`}
                  onBusy={onBusy}
                  onError={onError}
                  onFlash={onFlash}
                  onChanged={onChanged}
                  onDeleted={onDeleted}
                />
              ))}
            </ul>
          )}

          <div className={styles.row}>
            <input
              className={styles.input}
              value={title}
              data-testid="subpage-title"
              placeholder="Title (e.g. Portfolio)"
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className={styles.input}
              value={segment}
              data-testid="subpage-segment"
              placeholder="Segment (e.g. portfolio)"
              onChange={(e) => setSegment(e.target.value.toLowerCase())}
            />
            <button
              type="button"
              className={styles.primaryButton}
              data-testid="subpage-create"
              onClick={() => void create()}
            >
              Create
            </button>
          </div>
          <p className={styles.hint}>
            Live at /{hub?.path ?? "your-name"}/{"<segment>"} once created.
          </p>
        </>
      )}
    </section>
  );
}

function SubPageRow({
  page,
  busy,
  onBusy,
  onError,
  onFlash,
  onChanged,
  onDeleted,
}: {
  page: SettingsPageData;
  busy: boolean;
  onBusy: (v: string | null) => void;
  onError: (msg: string) => void;
  onFlash: (msg: string) => void;
  onChanged: (p: SettingsPageData) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [descriptor, setDescriptor] = useState(page.descriptor ?? "");

  async function save() {
    onBusy(`subpage-${page.id}`);
    onError("");
    try {
      const res = await fetch(`/api/settings/subpages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), descriptor }),
      });
      if (!res.ok) {
        onError("Couldn't update sub-page.");
        return;
      }
      const data = (await res.json()) as { page: SettingsPageData };
      onChanged(data.page);
      onFlash("Sub-page updated.");
    } finally {
      onBusy(null);
    }
  }

  async function remove() {
    onBusy(`subpage-${page.id}`);
    onError("");
    try {
      const res = await fetch(`/api/settings/subpages/${page.id}`, { method: "DELETE" });
      if (!res.ok) {
        onError("Couldn't delete sub-page.");
        return;
      }
      onDeleted(page.id);
      onFlash("Sub-page deleted.");
    } finally {
      onBusy(null);
    }
  }

  return (
    <li className={styles.entry} data-testid="subpage-row">
      <p className={styles.pagePath}>/{page.path}</p>
      <div className={styles.row}>
        <input
          className={styles.input}
          value={title}
          data-testid={`subpage-title-${page.id}`}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={styles.input}
          value={descriptor}
          placeholder="Descriptor"
          onChange={(e) => setDescriptor(e.target.value)}
        />
      </div>
      <div className={styles.row}>
        <a
          className={styles.ghostLink}
          href={`/${page.path}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View →
        </a>
        <button
          type="button"
          className={styles.ghostButton}
          disabled={busy}
          onClick={() => void save()}
        >
          Save
        </button>
        <button
          type="button"
          className={styles.dangerButton}
          disabled={busy}
          onClick={() => void remove()}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
