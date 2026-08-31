"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./pricing.module.css";

const PLANS: {
  cycle: "monthly" | "annual" | "lifetime";
  name: string;
  price: string;
  alt: string;
  features: string[];
}[] = [
  {
    cycle: "monthly",
    name: "Monthly",
    price: "$30",
    alt: "per month · renews monthly",
    features: [
      "One-word name claim",
      "Name protection while subscribed",
      "Name monitoring alerts",
      "Unlimited pages & sub-pages",
      "Import auto-sync",
      "Custom domain",
      "Deep SEO / Search Console",
    ],
  },
  {
    cycle: "annual",
    name: "Annual",
    price: "$299",
    alt: "per year · ~$25/mo · save 17%",
    features: [
      "Everything in Monthly",
      "Best value for active owners",
      "30-day grace if you lapse",
    ],
  },
  {
    cycle: "lifetime",
    name: "Lifetime",
    price: "$1,399",
    alt: "one-time · premium forever",
    features: ["Everything in Premium", "Pay once, own it forever", "No recurring billing"],
  },
];

export default function CheckoutButtons() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function begin(cycle: "monthly" | "annual" | "lifetime") {
    setBusy(cycle);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle }),
      });
      if (res.status === 401) {
        router.push("/login?callbackUrl=%2Fpricing");
        return;
      }
      const data = (await res.json()) as { url?: string | null; error?: string };
      if (!res.ok || !data.url) {
        setError(
          data.error === "checkout_failed"
            ? "Couldn't start checkout — billing isn't configured yet. Please try again shortly."
            : "Couldn't start checkout. Please try again."
        );
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error ? (
        <p className={styles.error} role="alert" data-testid="checkout-error">
          {error}
        </p>
      ) : null}
      <div className={styles.plans}>
        {PLANS.map((p, i) => (
          <div key={p.cycle} className={`${styles.plan} ${i === 1 ? styles.highlight : ""}`}>
            <h3 className={styles.planName}>{p.name}</h3>
            <p className={styles.planPrice}>{p.price}</p>
            <p className={styles.planAlt}>{p.alt}</p>
            <ul className={styles.planList}>
              {p.features.map((f) => (
                <li key={f} className={styles.planFeature}>
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={styles.cta}
              onClick={() => void begin(p.cycle)}
              disabled={busy !== null}
              data-testid={`checkout-${p.cycle}`}
            >
              {busy === p.cycle ? "Taking you to checkout…" : `Go Premium · ${p.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
