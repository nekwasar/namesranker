"use client";

import { useRef, useState } from "react";
import styles from "./photo-uploader.module.css";

const UPLOAD_ERRORS: Record<string, string> = {
  unauthenticated: "You need to be signed in to upload a photo.",
  rate_limited: "Too many uploads in the last minute. Please wait a moment.",
  missing_file: "No file selected.",
  too_large: "That file is larger than 5 MB. Please choose a smaller image.",
  not_an_image: "That file isn't a supported image (JPEG, PNG, WebP, GIF, or AVIF).",
  storage_failed: "Upload failed. Please try again.",
  invalid_form: "Upload failed. Please try again.",
};

/**
 * Self-hosted profile-photo uploader. Uploads to POST /api/upload and reports
 * the returned same-origin URL back via `onChange` — the URL is then saved
 * with the rest of the profile (content block / onboarding draft).
 */
export default function PhotoUploader({
  value,
  onChange,
  testid,
}: {
  value: string;
  onChange: (url: string) => void;
  /** Base test id — emits `${testid}-upload`, `${testid}-remove`, `${testid}-uploader`. */
  testid?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        setError(UPLOAD_ERRORS[data?.error ?? ""] ?? "Upload failed. Please try again.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={styles.wrap} data-testid={testid ? `${testid}-uploader` : undefined}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="Profile photo preview" className={styles.preview} />
      ) : (
        <div className={styles.emptyPreview}>No photo yet</div>
      )}
      <div className={styles.row}>
        <button
          type="button"
          className={styles.uploadBtn}
          disabled={busy}
          data-testid={testid ? `${testid}-upload` : undefined}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
        </button>
        {value ? (
          <button
            type="button"
            className={styles.removeBtn}
            data-testid={testid ? `${testid}-remove` : undefined}
            onClick={() => onChange("")}
          >
            Remove
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className={styles.hidden}
          data-testid={testid ? `${testid}-file` : undefined}
          onChange={handleFile}
        />
      </div>
      {error ? (
        <p className={styles.error} data-testid={testid ? `${testid}-error` : undefined}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
