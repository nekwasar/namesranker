"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import styles from "@/components/auth/auth.module.css";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (res.ok) {
      setStatus("sent");
      return;
    }
    setStatus("error");
    setError(
      data.error === "rate_limited"
        ? "Too many attempts. Please wait a few minutes and try again."
        : "Please enter a valid email address."
    );
  }

  if (status === "sent") {
    return (
      <div className={styles.success} data-testid="forgot-sent">
        <h2 className={styles.successTitle}>Check your email</h2>
        <p className={styles.successBody}>
          If an account exists for <strong>{email}</strong>, we&rsquo;ve sent a link to reset your
          password. It expires in 1 hour.
        </p>
        <button type="button" className={styles.link} onClick={() => setStatus("idle")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} data-testid="forgot-form" noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="forgot-email"
            required
          />
        </div>

        {error ? (
          <p className={styles.error} role="alert" data-testid="forgot-error">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className={styles.submit}
          data-testid="forgot-submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Remembered it?{" "}
          <Link href="/login" className={styles.link}>
            Back to sign in
          </Link>
        </p>
      </div>
    </>
  );
}
