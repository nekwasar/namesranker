"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ErrorKey = "invalid" | "used" | "expired" | "rate_limited" | "invalid_email";

const errorMessages: Record<ErrorKey, string> = {
  invalid: "This sign-in link is invalid. Please request a new one.",
  used: "This sign-in link has already been used. Please request a new one.",
  expired: "This sign-in link has expired. Please request a new one.",
  rate_limited: "Too many requests. Please wait a minute and try again.",
  invalid_email: "Please enter a valid email address.",
};

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const queryError =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("error") as ErrorKey | null)
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setStatus("sent");
      return;
    }

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setStatus("error");
    setError(errorMessages[(data.error as ErrorKey) ?? "invalid_email"] ?? "Something went wrong.");
  }

  if (status === "sent") {
    return (
      <div>
        <h1>Check your email</h1>
        <p>
          We sent a sign-in link to <strong>{email}</strong>. It expires in 15 minutes and can only
          be used once.
        </p>
        <button onClick={() => setStatus("idle")}>Use a different email</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Sign in to NamesRanker</h1>
      <p>Enter your email and we&apos;ll send you a magic link.</p>

      {queryError ? <p role="alert">{errorMessages[queryError]}</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send sign-in link"}
        </button>
      </form>

      <p>
        <button onClick={() => router.push("/")}>Back to home</button>
      </p>
    </div>
  );
}
