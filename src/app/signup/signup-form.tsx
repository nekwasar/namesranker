"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "@/components/auth/auth.module.css";

interface ApiError {
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  account_exists: "An account with this email already exists. Sign in instead.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
};

export default function SignupForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(
    () => ({
      length: password.length >= 8,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    }),
    [password]
  );

  const strengthList = [
    { label: "At least 8 characters", met: strength.length },
    { label: "A lowercase letter", met: strength.lower },
    { label: "An uppercase letter", met: strength.upper },
    { label: "A number", met: strength.number },
    { label: "A symbol (!@#$…)", met: strength.symbol },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiError;

    if (res.ok) {
      setStatus("sent");
      return;
    }

    setStatus("error");
    if (data.error === "weak_password") {
      setError(
        "Your password needs at least 8 characters with an uppercase letter, a lowercase letter, a number, and a symbol."
      );
    } else {
      setError(ERROR_MESSAGES[data.error ?? ""] ?? "Something went wrong. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className={styles.success} data-testid="signup-success">
        <h2 className={styles.successTitle}>Check your email</h2>
        <p className={styles.successBody}>
          We sent a verification link to <strong>{email}</strong>. Click it to verify your email and
          finish creating your account. The link expires in 24 hours.
        </p>
        <button type="button" className={styles.link} onClick={() => setStatus("idle")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} data-testid="signup-form" noValidate>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-first">
              First name
            </label>
            <input
              id="signup-first"
              className={styles.input}
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              data-testid="signup-first"
              required
              maxLength={50}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-last">
              Last name
            </label>
            <input
              id="signup-last"
              className={styles.input}
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              data-testid="signup-last"
              required
              maxLength={50}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="signup-email"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="signup-password"
            required
          />
          <ul className={styles.reasons} data-testid="signup-strength">
            {strengthList.map((r) => (
              <li key={r.label} className={`${styles.reason} ${r.met ? styles.reasonMet : ""}`}>
                {r.met ? "✓" : "·"} {r.label}
              </li>
            ))}
          </ul>
        </div>

        {error ? (
          <p className={styles.error} role="alert" data-testid="signup-error">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className={styles.submit}
          data-testid="signup-submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
