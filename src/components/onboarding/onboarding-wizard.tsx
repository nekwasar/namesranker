"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConnectorItem, PreviewData } from "@/lib/onboarding";
import PagePreview from "./page-preview";
import styles from "./onboarding-wizard.module.css";

const STEP_LABELS = ["Name", "Profile", "Links", "Work", "Credibility", "Imports", "Launch"];

// Upsert an item at a list index, growing the list if needed (used by the
// phantom empty rows shown when a list has no saved entries yet).
function upsertAt<T>(list: T[], index: number, item: T): T[] {
  if (index < list.length) return list.map((x, j) => (j === index ? item : x));
  return [...list, item];
}

export default function OnboardingWizard({
  step,
  initial,
}: {
  step: number;
  initial: PreviewData;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<PreviewData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<{ url: string; path: string } | null>(null);

  function patch(p: Partial<PreviewData>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  async function save(data: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data }),
      });
      if (!res.ok) {
        setError("Couldn't save this step. Please try again.");
        return;
      }
      router.push(`/onboarding?step=${step + 1}`);
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
      if (!res.ok) {
        setError("Couldn't skip this step. Please try again.");
        return;
      }
      const { nextStep } = (await res.json()) as { nextStep: number };
      if (nextStep === step) {
        router.push("/settings");
      } else {
        router.push(`/onboarding?step=${nextStep}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      if (!res.ok) {
        setError("Couldn't publish your page. Please try again.");
        return;
      }
      const data = (await res.json()) as { url: string; path: string };
      setPublished(data);
    } finally {
      setSaving(false);
    }
  }

  if (published) {
    return <PublishSuccess url={published.url} path={published.path} />;
  }

  return (
    <div className={styles.wizard}>
      <ol className={styles.progress} data-testid="wizard-progress">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li
              key={label}
              className={`${styles.progressItem} ${current ? styles.current : ""} ${done ? styles.done : ""}`}
              data-testid={current ? "wizard-current-step" : undefined}
            >
              <span className={styles.progressDot}>{done ? "✓" : n}</span>
              <span className={styles.progressLabel}>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className={styles.layout}>
        <div className={styles.form}>
          <StepForm
            step={step}
            draft={draft}
            patch={patch}
            onSave={save}
            onSkip={skip}
            onPublish={publish}
            saving={saving}
          />
          {error ? (
            <p className={styles.error} role="alert" data-testid="wizard-error">
              {error}
            </p>
          ) : null}
          <p className={styles.exitLink}>
            <a href="/settings">Save progress &amp; exit to settings</a>
          </p>
        </div>

        {step < 7 ? (
          <aside className={styles.previewPanel}>
            <p className={styles.previewLabel}>Live preview</p>
            <PagePreview draft={draft} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function StepForm({
  step,
  draft,
  patch,
  onSave,
  onSkip,
  onPublish,
  saving,
}: {
  step: number;
  draft: PreviewData;
  patch: (p: Partial<PreviewData>) => void;
  onSave: (data: Record<string, unknown>) => void;
  onSkip: () => void;
  onPublish: () => void;
  saving: boolean;
}) {
  if (step === 2) {
    return (
      <div data-testid="step-2" className={styles.step}>
        <h2>Your headline &amp; bio</h2>
        <p className={styles.stepHint}>This is what people see first on Google.</p>
        <label className={styles.label} htmlFor="descriptor-input">
          Headline (profession · location)
        </label>
        <input
          id="descriptor-input"
          data-testid="descriptor-input"
          className={styles.input}
          value={draft.descriptor ?? ""}
          placeholder="Product Designer · Austin, TX"
          onChange={(e) => patch({ descriptor: e.target.value })}
        />
        <label className={styles.label} htmlFor="photo-url">
          Profile photo URL
        </label>
        <input
          id="photo-url"
          data-testid="photo-url"
          className={styles.input}
          type="url"
          value={draft.photoUrl ?? ""}
          placeholder="https://…"
          onChange={(e) => patch({ photoUrl: e.target.value })}
        />
        <label className={styles.label} htmlFor="bio-input">
          Short bio
        </label>
        <textarea
          id="bio-input"
          data-testid="bio-input"
          className={styles.textarea}
          rows={4}
          value={draft.bio ?? ""}
          placeholder="Who are you and what do you do?"
          onChange={(e) => patch({ bio: e.target.value })}
        />
        <Actions
          onSave={() =>
            onSave({ descriptor: draft.descriptor, photoUrl: draft.photoUrl, bio: draft.bio })
          }
          onSkip={onSkip}
          saving={saving}
        />
      </div>
    );
  }

  if (step === 3) {
    const socialRows = draft.socials.length > 0 ? draft.socials : [{ platform: "", url: "" }];
    return (
      <div data-testid="step-3" className={styles.step}>
        <h2>Links &amp; socials</h2>
        <p className={styles.stepHint}>
          Your page links out to your real footprint — that&apos;s how Google trusts it.
        </p>
        {socialRows.map((s, i) => (
          <div key={i} className={styles.row} data-testid="social-row">
            <input
              data-testid={`social-platform-${i}`}
              className={styles.input}
              value={s.platform}
              placeholder="Platform (LinkedIn, GitHub…)"
              onChange={(e) =>
                patch({ socials: upsertAt(draft.socials, i, { ...s, platform: e.target.value }) })
              }
            />
            <input
              data-testid={`social-url-${i}`}
              className={styles.input}
              type="url"
              value={s.url}
              placeholder="https://…"
              onChange={(e) =>
                patch({ socials: upsertAt(draft.socials, i, { ...s, url: e.target.value }) })
              }
            />
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => patch({ socials: draft.socials.filter((_, j) => j !== i) })}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => patch({ socials: [...draft.socials, { platform: "", url: "" }] })}
        >
          + Add link
        </button>
        <Actions onSave={() => onSave({ links: draft.socials })} onSkip={onSkip} saving={saving} />
      </div>
    );
  }

  if (step === 4) {
    const expRows = draft.experience.length > 0 ? draft.experience : [{ role: "", company: "" }];
    const projectRows = draft.projects.length > 0 ? draft.projects : [{ title: "" }];
    return (
      <div data-testid="step-4" className={styles.step}>
        <h2>Experience &amp; projects</h2>
        <p className={styles.stepHint}>Your work history and the things you&apos;ve built.</p>

        <h3 className={styles.groupTitle}>Experience</h3>
        {expRows.map((e, i) => (
          <div key={i} className={styles.card} data-testid="experience-row">
            <input
              data-testid={`experience-role-${i}`}
              className={styles.input}
              value={e.role}
              placeholder="Role"
              onChange={(ev) =>
                patch({
                  experience: upsertAt(draft.experience, i, { ...e, role: ev.target.value }),
                })
              }
            />
            <input
              data-testid={`experience-company-${i}`}
              className={styles.input}
              value={e.company}
              placeholder="Company"
              onChange={(ev) =>
                patch({
                  experience: upsertAt(draft.experience, i, { ...e, company: ev.target.value }),
                })
              }
            />
            <div className={styles.row}>
              <input
                className={styles.input}
                value={e.location ?? ""}
                placeholder="Location"
                onChange={(ev) =>
                  patch({
                    experience: upsertAt(draft.experience, i, { ...e, location: ev.target.value }),
                  })
                }
              />
              <input
                className={styles.input}
                value={e.start ?? ""}
                placeholder="Start (2020)"
                onChange={(ev) =>
                  patch({
                    experience: upsertAt(draft.experience, i, { ...e, start: ev.target.value }),
                  })
                }
              />
              <input
                className={styles.input}
                value={e.end ?? ""}
                placeholder="End (2023)"
                onChange={(ev) =>
                  patch({
                    experience: upsertAt(draft.experience, i, { ...e, end: ev.target.value }),
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
                patch({
                  experience: upsertAt(draft.experience, i, { ...e, summary: ev.target.value }),
                })
              }
            />
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => patch({ experience: draft.experience.filter((_, j) => j !== i) })}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => patch({ experience: [...draft.experience, { role: "", company: "" }] })}
        >
          + Add role
        </button>

        <h3 className={styles.groupTitle}>Projects</h3>
        {projectRows.map((p, i) => (
          <div key={i} className={styles.card} data-testid="project-row">
            <input
              data-testid={`project-title-${i}`}
              className={styles.input}
              value={p.title}
              placeholder="Project title"
              onChange={(ev) =>
                patch({ projects: upsertAt(draft.projects, i, { ...p, title: ev.target.value }) })
              }
            />
            <input
              className={styles.input}
              value={p.description ?? ""}
              placeholder="What is it?"
              onChange={(ev) =>
                patch({
                  projects: upsertAt(draft.projects, i, { ...p, description: ev.target.value }),
                })
              }
            />
            <input
              className={styles.input}
              type="url"
              value={p.url ?? ""}
              placeholder="https://…"
              onChange={(ev) =>
                patch({ projects: upsertAt(draft.projects, i, { ...p, url: ev.target.value }) })
              }
            />
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => patch({ projects: draft.projects.filter((_, j) => j !== i) })}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => patch({ projects: [...draft.projects, { title: "" }] })}
        >
          + Add project
        </button>
        <Actions
          onSave={() => onSave({ experience: draft.experience, projects: draft.projects })}
          onSkip={onSkip}
          saving={saving}
        />
      </div>
    );
  }

  if (step === 5) {
    const pubRows = draft.publications.length > 0 ? draft.publications : [{ title: "" }];
    const testimonialRows = draft.testimonials.length > 0 ? draft.testimonials : [{ quote: "" }];
    return (
      <div data-testid="step-5" className={styles.step}>
        <h2>Publications &amp; testimonials</h2>
        <p className={styles.stepHint}>Proof makes your name rank — and convert.</p>

        <h3 className={styles.groupTitle}>Publications</h3>
        {pubRows.map((p, i) => (
          <div key={i} className={styles.card} data-testid="publication-row">
            <input
              data-testid={`publication-title-${i}`}
              className={styles.input}
              value={p.title}
              placeholder="Title"
              onChange={(ev) =>
                patch({
                  publications: upsertAt(draft.publications, i, { ...p, title: ev.target.value }),
                })
              }
            />
            <input
              className={styles.input}
              type="url"
              value={p.url ?? ""}
              placeholder="https://…"
              onChange={(ev) =>
                patch({
                  publications: upsertAt(draft.publications, i, { ...p, url: ev.target.value }),
                })
              }
            />
            <input
              className={styles.input}
              value={p.publisher ?? ""}
              placeholder="Publisher"
              onChange={(ev) =>
                patch({
                  publications: upsertAt(draft.publications, i, {
                    ...p,
                    publisher: ev.target.value,
                  }),
                })
              }
            />
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => patch({ publications: draft.publications.filter((_, j) => j !== i) })}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => patch({ publications: [...draft.publications, { title: "" }] })}
        >
          + Add publication
        </button>

        <h3 className={styles.groupTitle}>Testimonials</h3>
        {testimonialRows.map((t, i) => (
          <div key={i} className={styles.card} data-testid="testimonial-row">
            <textarea
              className={styles.textarea}
              rows={2}
              value={t.quote}
              placeholder="“What did they say?”"
              onChange={(ev) =>
                patch({
                  testimonials: upsertAt(draft.testimonials, i, { ...t, quote: ev.target.value }),
                })
              }
            />
            <input
              data-testid={`testimonial-author-${i}`}
              className={styles.input}
              value={t.author ?? ""}
              placeholder="Author"
              onChange={(ev) =>
                patch({
                  testimonials: upsertAt(draft.testimonials, i, { ...t, author: ev.target.value }),
                })
              }
            />
            <input
              className={styles.input}
              value={t.role ?? ""}
              placeholder="Their role"
              onChange={(ev) =>
                patch({
                  testimonials: upsertAt(draft.testimonials, i, { ...t, role: ev.target.value }),
                })
              }
            />
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => patch({ testimonials: draft.testimonials.filter((_, j) => j !== i) })}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => patch({ testimonials: [...draft.testimonials, { quote: "" }] })}
        >
          + Add testimonial
        </button>
        <Actions
          onSave={() =>
            onSave({ publications: draft.publications, testimonials: draft.testimonials })
          }
          onSkip={onSkip}
          saving={saving}
        />
      </div>
    );
  }

  if (step === 6) {
    return (
      <div data-testid="step-6" className={styles.step}>
        <h2>Import your content</h2>
        <p className={styles.stepHint}>
          Connect a blog, GitHub, or YouTube and we&apos;ll pull your latest work onto the page.
          Free accounts sync manually; premium auto-syncs (arrives in a later milestone).
        </p>
        {(["RSS", "GITHUB", "YOUTUBE"] as const).map((type) => (
          <ConnectorRow key={type} type={type} connectors={draft.connectors} patch={patch} />
        ))}
        <Actions
          onSave={() => onSave({ connectors: draft.connectors })}
          onSkip={onSkip}
          saving={saving}
        />
      </div>
    );
  }

  // Step 7 — review & launch
  return (
    <div data-testid="step-7" className={styles.step}>
      <h2>Review &amp; launch</h2>
      <p className={styles.stepHint}>Here&apos;s your page as the world will see it.</p>
      <PagePreview draft={draft} />
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="publish-button"
          disabled={saving}
          onClick={onPublish}
        >
          {saving ? "Publishing…" : "Publish my page"}
        </button>
        <button
          type="button"
          className={styles.ghostButton}
          data-testid="finish-later"
          disabled={saving}
          onClick={onSkip}
        >
          Finish later
        </button>
      </div>
    </div>
  );
}

function ConnectorRow({
  type,
  connectors,
  patch,
}: {
  type: "RSS" | "GITHUB" | "YOUTUBE";
  connectors: ConnectorItem[];
  patch: (p: Partial<PreviewData>) => void;
}) {
  const entry = connectors.find((c) => c.type === type);
  const value = entry?.externalUrl ?? "";
  return (
    <div className={styles.row} data-testid={`connector-${type.toLowerCase()}`}>
      <span className={styles.connectorLabel}>{type}</span>
      <input
        data-testid={`connector-url-${type.toLowerCase()}`}
        className={styles.input}
        type="url"
        value={value}
        placeholder={
          type === "RSS"
            ? "https://yourblog.com/feed.xml"
            : type === "GITHUB"
              ? "https://github.com/you"
              : "https://youtube.com/@you"
        }
        onChange={(e) => {
          const next = connectors.filter((c) => c.type !== type);
          if (e.target.value) next.push({ type, externalUrl: e.target.value });
          patch({ connectors: next });
        }}
      />
    </div>
  );
}

function Actions({
  onSave,
  onSkip,
  saving,
}: {
  onSave: () => void;
  onSkip: () => void;
  saving: boolean;
}) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.primaryButton}
        data-testid="wizard-continue"
        disabled={saving}
        onClick={onSave}
      >
        {saving ? "Saving…" : "Save & continue"}
      </button>
      <button
        type="button"
        className={styles.ghostButton}
        data-testid="wizard-skip"
        disabled={saving}
        onClick={onSkip}
      >
        Skip
      </button>
    </div>
  );
}

function PublishSuccess({ url, path }: { url: string; path: string }) {
  const encoded = encodeURIComponent(url);
  const shareUrl = `https://namesranker.com/${path}`;
  return (
    <div className={styles.success} data-testid="publish-success">
      <h2>🎉 Your page is live!</h2>
      <p>
        <a href={url} data-testid="live-page-link" target="_blank" rel="noopener noreferrer">
          {shareUrl}
        </a>
      </p>
      <p className={styles.stepHint}>
        Share it everywhere — every link back to your page helps it rank.
      </p>
      <div className={styles.shareRow}>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.shareButton}
        >
          Share on LinkedIn
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out my page: ")}&url=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.shareButton}
        >
          Share on X
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent("My page is live!")}&body=${encoded}`}
          className={styles.shareButton}
        >
          Email it
        </a>
      </div>
      <p className={styles.stepHint}>
        Add the official NamesRanker badge to your LinkedIn, email signature, or business card —
        it&apos;s a natural backlink to your page.
      </p>
      <a href="/settings" className={styles.primaryButton} data-testid="publish-to-settings">
        Go to settings
      </a>
    </div>
  );
}
