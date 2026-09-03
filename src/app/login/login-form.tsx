"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/components/auth/auth.module.css";

type Method = "password" | "magic";

type QueryError = "invalid" | "used" | "expired" | "rate_limited";

const queryErrorMessages: Record<QueryError, string> = {
  invalid: "This link is invalid. Please request a new one.",
  used: "This link has already been used. Please request a new one.",
  expired: "This link has expired. Please request a new one.",
  rate_limited: "Too many requests. Please wait a minute and try again.",
};

const API_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_verified: "Your email isn't verified yet. Check your inbox for the verification link.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
  invalid_email: "Please enter a valid email address.",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [method, setMethod] = useState<Method>("password");

  // Password mode.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "no-account" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const queryError = searchParams.get("error") as QueryError | null;
  const next = searchParams.get("next");

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);

    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, next }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };

    if (res.ok) {
      router.push(data.next ?? "/chat");
      router.refresh();
      return;
    }
    setStatus("error");
    setError(API_ERROR_MESSAGES[data.error ?? ""] ?? "Something went wrong. Please try again.");
  }

  async function handleMagicSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);

    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      needsAccount?: boolean;
    };

    if (res.ok) {
      // The API only emails existing accounts; if none exists, tell the user
      // (they typed their own address) instead of pretending we sent a link.
      setStatus(data.needsAccount ? "no-account" : "sent");
      return;
    }
    setStatus("error");
    setError(API_ERROR_MESSAGES[data.error ?? ""] ?? "Something went wrong. Please try again.");
  }

  if (status === "no-account") {
    return (
      <div className={styles.success} data-testid="login-no-account">
        <h2 className={styles.successTitle}>No account found</h2>
        <p className={styles.successBody}>
          There&rsquo;s no NamesRanker account for <strong>{email}</strong>. Create one to claim
          your name — it takes under a minute.
        </p>
        <Link href="/signup" className={styles.submitLink} data-testid="login-no-account-signup">
          Create an account
        </Link>
        <button type="button" className={styles.link} onClick={() => setStatus("idle")}>
          Use a different email
        </button>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className={styles.success} data-testid="login-sent">
        <h2 className={styles.successTitle}>Check your email</h2>
        <p className={styles.successBody}>
          We sent a {method === "magic" ? "sign-in link" : "link"} to <strong>{email}</strong>.{" "}
          {method === "magic"
            ? "It expires in 15 minutes and can only be used once."
            : "Use the link in your inbox."}
        </p>
        <button type="button" className={styles.link} onClick={() => setStatus("idle")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      {queryError ? (
        <p className={styles.error} role="alert" data-testid="login-query-error">
          {queryErrorMessages[queryError]}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert" data-testid="login-error">
          {error}
        </p>
      ) : null}

      <div className={styles.tabs} role="tablist" aria-label="Sign in method">
        {(
          [
            ["password", "Password"],
            ["magic", "Magic link"],
          ] as [Method, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            className={`${styles.tab} ${method === m ? styles.tabActive : ""}`}
            data-testid={`login-method-${m}`}
            onClick={() => setMethod(m)}
          >
            {label}
          </button>
        ))}
      </div>

      {method === "password" ? (
        <form
          className={styles.form}
          onSubmit={handlePasswordSubmit}
          data-testid="login-password-form"
          noValidate
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
              required
            />
            <Link href="/forgot-password" className={styles.link}>
              Forgot your password?
            </Link>
          </div>
          <button
            type="submit"
            className={styles.submit}
            data-testid="login-submit"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form
          className={styles.form}
          onSubmit={handleMagicSubmit}
          data-testid="login-magic-form"
          noValidate
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-magic-email">
              Email
            </label>
            <input
              id="login-magic-email"
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-magic-email"
              required
            />
          </div>
          <button
            type="submit"
            className={styles.submit}
            data-testid="login-magic-submit"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}

      <div className={styles.footer}>
        <p className={styles.footerText}>
          New here?{" "}
          <Link href="/signup" className={styles.link} data-testid="login-to-signup">
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}
