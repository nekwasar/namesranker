"use client";

import { useState } from "react";
import {
  ENVELOPE_SURFACE_META,
  PERMISSION_LEVELS,
  PERMISSION_LEVEL_META,
  PermissionEnvelope,
  PermissionLevel,
  EnvelopeSurface,
} from "@/lib/agent/envelope";
import styles from "./envelope.module.css";

type SurfaceRow = { surface: EnvelopeSurface; level: PermissionLevel };

export default function EnvelopeEditor({ initial }: { initial: PermissionEnvelope }) {
  const [surfaces, setSurfaces] = useState<SurfaceRow[]>(
    ENVELOPE_SURFACE_META.map((m) => ({
      surface: m.surface,
      level: initial.surfaces[m.surface],
    }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(surface: EnvelopeSurface, level: PermissionLevel) {
    const next = surfaces.map((s) => (s.surface === surface ? { ...s, level } : s));
    setSurfaces(next);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const payload = Object.fromEntries(next.map((s) => [s.surface, s.level])) as Record<
        EnvelopeSurface,
        PermissionLevel
      >;
      const res = await fetch("/api/settings/envelope", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surfaces: payload }),
      });
      if (!res.ok) throw new Error("save_failed");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrap} data-testid="envelope-editor">
      {surfaces.map((row) => {
        const meta = ENVELOPE_SURFACE_META.find((m) => m.surface === row.surface)!;
        return (
          <div key={row.surface} className={styles.row} data-testid={`envelope-${row.surface}`}>
            <div className={styles.rowText}>
              <p className={styles.rowTitle}>{meta.title}</p>
              <p className={styles.rowDesc}>{meta.description}</p>
              <p className={styles.rowLevelNote}>{PERMISSION_LEVEL_META[row.level].description}</p>
            </div>
            <div className={styles.levels} role="radiogroup" aria-label={meta.title}>
              {PERMISSION_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={row.level === level}
                  disabled={saving}
                  className={`${styles.level} ${row.level === level ? styles.levelActive : ""}`}
                  title={PERMISSION_LEVEL_META[level].title}
                  onClick={() => void save(row.surface, level)}
                  data-testid={`envelope-level-${row.surface}-${level.toLowerCase()}`}
                >
                  {PERMISSION_LEVEL_META[level].title}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className={styles.foot} role="status" data-testid="envelope-status">
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : saved ? (
          <span className={styles.ok}>Saved — your agent will follow these rules.</span>
        ) : (
          <span>Pick a level per area — changes save immediately.</span>
        )}
      </p>
    </div>
  );
}
