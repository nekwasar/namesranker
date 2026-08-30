"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./monitoring-manager.module.css";

interface MonitoringRule {
  id: string;
  nameToMonitor: string;
  lastAlertAt: string | null;
  createdAt: string;
}

export default function MonitoringManager({ premium }: { premium: boolean }) {
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/claims/monitoring");
      if (!res.ok) return;
      const data = (await res.json()) as { rules: MonitoringRule[] };
      setRules(data.rules);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRule(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/claims/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameToMonitor: name.trim() }),
      });
      if (res.status === 403) {
        setError("Name monitoring is a premium feature.");
        return;
      }
      if (!res.ok) {
        setError("Couldn't add that name. Please try again.");
        return;
      }
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeRule(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/claims/monitoring/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't remove that rule. Please try again.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!premium) {
    return (
      <section className={styles.wrapper} data-testid="monitoring-upsell">
        <h2>Name monitoring</h2>
        <p className={styles.hint}>
          Get alerted when anyone claims a slug matching your name — a premium feature.
        </p>
        <Link href="/pricing" className={styles.primaryButton}>
          Go Premium
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.wrapper} data-testid="monitoring-manager">
      <h2>Name monitoring</h2>
      <p className={styles.hint}>
        We&apos;ll alert you when anyone claims a slug matching a name you&apos;re watching.
      </p>

      <form onSubmit={addRule} className={styles.form}>
        <input
          data-testid="monitoring-name"
          className={styles.input}
          type="text"
          value={name}
          placeholder="e.g. Jane Doe"
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          className={styles.primaryButton}
          data-testid="monitoring-add"
          disabled={busy || !name.trim()}
        >
          {busy ? "Saving…" : "Watch this name"}
        </button>
      </form>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {loaded && rules.length === 0 ? (
        <p className={styles.hint}>No names being watched yet.</p>
      ) : null}

      <ul className={styles.list} data-testid="monitoring-list">
        {rules.map((rule) => (
          <li key={rule.id} className={styles.item} data-testid="monitoring-rule">
            <span className={styles.name}>{rule.nameToMonitor}</span>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => void removeRule(rule.id)}
              disabled={busy}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
