"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import styles from "@/components/auth/auth.module.css";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;

    if (password !== confirm) {
      setStatus("error");
      setError("Passwords don't match.");
      return;
    }

    setStatus("sending");
    setError(null);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (res.ok) {
      setStatus("done");
      return;
    }
    setStatus("error");
    if (data.error === "weak_password") {
      setError(
        "Your password needs at least 8 characters with an uppercase letter, a lowercase letter, a number, and a symbol."
      );
    } else if (data.error === "invalid" || data.error === "used" || data.error === "expired") {
      setError("This reset link is invalid or expired. Please request a new one.");
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className={styles.success} data-testid="reset-done">
        <h2 className={styles.successTitle}>Password updated</h2>
        <p className={styles.successBody}>
          Your password has been changed. You can now sign in with it.
        </p>
        <Link href="/login" className={styles.link} data-testid="reset-to-login">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} data-testid="reset-form" noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-password">
            New password
          </label>
          <input
            id="reset-password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="reset-password"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-confirm">
            Confirm password
          </label>
          <input
            id="reset-confirm"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            data-testid="reset-confirm"
            required
          />
        </div>

        {error ? (
          <p className={styles.error} role="alert" data-testid="reset-error">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className={styles.submit}
          data-testid="reset-submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}
