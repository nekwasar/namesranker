"use client";

import { FormEvent, useState } from "react";
import styles from "./newsletter.module.css";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);

    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (res.ok) {
      setStatus("done");
      return;
    }
    setStatus("error");
    setError(
      data.error === "rate_limited"
        ? "Too many signups — please wait a few minutes."
        : "Please enter a valid email address."
    );
  }

  if (status === "done") {
    return (
      <p className={styles.done} data-testid="newsletter-done">
        You&rsquo;re on the list — we&rsquo;ll send ranking and naming tips, not noise.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} data-testid="newsletter-form" noValidate>
      <input
        type="email"
        className={styles.input}
        placeholder="you@example.com"
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="newsletter-email"
        required
      />
      <button
        type="submit"
        className={styles.button}
        data-testid="newsletter-submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Subscribing…" : "Subscribe"}
      </button>
      {error ? (
        <p className={styles.error} role="alert" data-testid="newsletter-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
