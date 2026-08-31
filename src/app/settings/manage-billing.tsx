"use client";

import { useState } from "react";

export default function ManageBilling() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(
          data.error === "no_customer"
            ? "We don't have a billing record for you yet."
            : "Couldn't open billing. Please try again."
        );
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't open billing. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy}
        data-testid="manage-billing"
      >
        {busy ? "Opening…" : "Manage plan & billing"}
      </button>
      {error ? (
        <span role="alert" style={{ color: "#b42318", marginLeft: 8 }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
