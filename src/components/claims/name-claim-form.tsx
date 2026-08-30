"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./name-claim-form.module.css";

interface AvailabilityVariant {
  keyword: string;
  slug: string;
  available: boolean;
  fallbackSlug: string;
  fallbackAvailable: boolean;
}

interface Availability {
  name: string;
  slug: string;
  wordCount: number;
  isOneWord: boolean;
  baseAvailable: boolean;
  variants: AvailabilityVariant[];
  claimable: boolean;
}

interface ProfessionKeywords {
  profession: string;
  keywords: string[];
}

interface RecentClaim {
  slug: string;
  ago: string;
}

interface ClaimSuccess {
  slug: string;
  pageUrl: string;
}

const errorMessages: Record<string, string> = {
  one_word_premium: "One-word names are premium — upgrade to claim this one.",
  keyword_required:
    "That slug was just taken. Pick a professional variant below and we'll claim the next best one.",
  no_slug_available: "That slug was just taken. Try another name or a different variant.",
  already_claimed: "You've already claimed a name. One hub page per person — that's the rule.",
  rate_limited: "Too many attempts — please wait a moment and try again.",
  unauthenticated: "Your session expired — please sign in again.",
  invalid_keyword: "That keyword is no longer available. Please pick another.",
};

export default function NameClaimForm({ premium }: { premium: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [professions, setProfessions] = useState<ProfessionKeywords[] | null>(null);
  const [profession, setProfession] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<ClaimSuccess | null>(null);
  const [recentClaims, setRecentClaims] = useState<RecentClaim[]>([]);

  const requestId = useRef(0);

  const fetchAvailability = useCallback(
    async (nameValue: string, professionValue: string | null) => {
      const params = new URLSearchParams({ name: nameValue });
      if (professionValue) params.set("profession", professionValue);
      const res = await fetch(`/api/claims/availability?${params.toString()}`);
      if (!res.ok) throw new Error("availability_failed");
      return (await res.json()) as Availability;
    },
    []
  );

  // Debounced availability check while typing (scarcity copy: "still available").
  // When the base slug is taken, preloads the curated keyword groups (spec §2.6)
  // and re-checks availability with the chosen profession so the variant picker
  // shows live claimable options.
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setAvailability(null);
      setError(null);
      return;
    }

    const id = ++requestId.current;
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const baseResult = await fetchAvailability(trimmed, null);
        if (requestId.current !== id) return;

        let final = baseResult;
        if (!baseResult.isOneWord && !baseResult.baseAvailable) {
          let groups = professions;
          if (!groups) {
            const kwRes = await fetch("/api/claims/keywords");
            if (kwRes.ok) {
              const data = (await kwRes.json()) as { professions: ProfessionKeywords[] };
              groups = data.professions;
              setProfessions(groups);
            }
          }
          const chosen = profession ?? groups?.[0]?.profession ?? null;
          if (chosen && profession === null) setProfession(chosen);
          if (chosen) {
            final = await fetchAvailability(trimmed, chosen);
          }
        }

        if (requestId.current !== id) return;
        setAvailability(final);
        setSelectedKeyword(null);
        setCustomSlug("");
        setError(null);
      } catch {
        if (requestId.current === id) setError("Couldn't check availability. Please try again.");
      } finally {
        if (requestId.current === id) setChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [name, profession, professions, fetchAvailability]);

  const loadRecentClaims = useCallback(async () => {
    try {
      const res = await fetch("/api/claims/recent?limit=6");
      if (!res.ok) return;
      const data = (await res.json()) as { claims: RecentClaim[] };
      setRecentClaims(data.claims);
    } catch {
      // Feed is decorative — ignore failures.
    }
  }, []);

  useEffect(() => {
    void loadRecentClaims();
  }, [loadRecentClaims]);

  function handleProfessionChange(next: string) {
    setProfession(next);
    setSelectedKeyword(null);
    setError(null);
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!availability || claiming) return;

    setClaiming(true);
    setError(null);

    const body: Record<string, string> = { name: availability.name };
    if (!availability.baseAvailable && !availability.isOneWord) {
      if (customSlug.trim()) {
        body.customSlug = customSlug.trim();
      } else if (selectedKeyword) {
        body.keyword = selectedKeyword;
      } else {
        setClaiming(false);
        setError("Pick a professional variant (or enter a custom handle).");
        return;
      }
    }

    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setClaiming(false);

    if (res.ok) {
      const data = (await res.json()) as { claim: { slug: string }; pageUrl: string };
      setClaimed({ slug: data.claim.slug, pageUrl: data.pageUrl });
      void loadRecentClaims();
      return;
    }

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    const code = data.error ?? "";
    setError(
      errorMessages[code] ??
        (code === "invalid_custom_slug"
          ? "That custom handle is invalid or reserved. Use lowercase letters, numbers, and single hyphens."
          : "Something went wrong. Please try again.")
    );
  }

  const baseTaken = availability !== null && !availability.isOneWord && !availability.baseAvailable;

  return (
    <section className={styles.wrapper}>
      {claimed ? (
        <div className={styles.success} data-testid="claim-success">
          <h2>
            You claimed <span className={styles.mono}>/{claimed.slug}</span> 🎉
          </h2>
          <p>
            Your page will live at{" "}
            <a href={claimed.pageUrl} className={styles.mono}>
              {claimed.pageUrl}
            </a>
            .
          </p>
          <div className={styles.successActions}>
            <button
              onClick={() => router.push("/onboarding?step=2")}
              className={styles.primaryButton}
              data-testid="claim-continue"
            >
              Continue — step 2 of 7
            </button>
            <Link href="/settings" className={styles.ghostLink}>
              Go to settings
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleClaim} className={styles.form}>
          <label className={styles.label} htmlFor="claim-name">
            What&apos;s your name?
          </label>
          <input
            id="claim-name"
            data-testid="claim-name"
            className={styles.input}
            type="text"
            placeholder="e.g. John Smith"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={claiming}
          />

          {checking ? <p className={styles.hint}>Checking availability…</p> : null}

          {!checking && availability && availability.isOneWord && !premium ? (
            <div className={styles.paywall} data-testid="one-word-paywall">
              <p>
                One-word names like <span className={styles.mono}>/{availability.slug}</span> are
                the scarcest — only premium members can claim them.
              </p>
              <Link href="/pricing" className={styles.primaryButton}>
                Go Premium to claim it
              </Link>
            </div>
          ) : null}

          {!checking &&
          availability &&
          availability.baseAvailable &&
          (!availability.isOneWord || premium) ? (
            <div className={styles.available} data-testid="availability">
              <p>
                <span className={styles.mono}>/{availability.slug}</span> is still available.{" "}
                <strong>Claim it before someone else does.</strong>
              </p>
              <button
                type="submit"
                className={styles.primaryButton}
                data-testid="claim-submit"
                disabled={claiming}
              >
                {claiming ? "Claiming…" : `Claim /${availability.slug}`}
              </button>
            </div>
          ) : null}

          {!checking && baseTaken ? (
            <div className={styles.variantPicker} data-testid="variant-picker">
              <p className={styles.takenCopy}>
                <span className={styles.mono}>/{availability.slug}</span> is taken — but the right
                long-tail variant can rank even better.
              </p>

              {professions && professions.length > 0 ? (
                <label className={styles.label} htmlFor="profession-select">
                  Your profession
                </label>
              ) : null}
              {professions && professions.length > 0 ? (
                <select
                  id="profession-select"
                  data-testid="profession-select"
                  className={styles.select}
                  value={profession ?? ""}
                  onChange={(e) => void handleProfessionChange(e.target.value)}
                >
                  {professions.map((p) => (
                    <option key={p.profession} value={p.profession}>
                      {p.profession}
                    </option>
                  ))}
                </select>
              ) : null}

              {availability.variants.length > 0 ? (
                <fieldset className={styles.keywordFieldset}>
                  <legend>Available variants</legend>
                  {availability.variants.map((variant) => {
                    const claimableSlug = variant.available
                      ? variant.slug
                      : variant.fallbackAvailable
                        ? variant.fallbackSlug
                        : null;
                    if (!claimableSlug) return null;
                    return (
                      <label key={variant.keyword} className={styles.radioRow}>
                        <input
                          type="radio"
                          name="keyword"
                          data-testid="keyword-option"
                          value={variant.keyword}
                          checked={selectedKeyword === variant.keyword}
                          onChange={() => setSelectedKeyword(variant.keyword)}
                        />
                        <span className={styles.mono}>/{claimableSlug}</span>
                      </label>
                    );
                  })}
                  {!availability.variants.some((v) => v.available || v.fallbackAvailable) ? (
                    <p className={styles.hint}>
                      All variants for this profession are taken — try another profession.
                    </p>
                  ) : null}
                </fieldset>
              ) : null}

              {premium ? (
                <div className={styles.customHandle}>
                  <label className={styles.label} htmlFor="custom-slug">
                    Or choose a custom handle (premium)
                  </label>
                  <input
                    id="custom-slug"
                    data-testid="custom-slug"
                    className={styles.input}
                    type="text"
                    placeholder="e.g. john-smith-dev"
                    value={customSlug}
                    onChange={(e) => {
                      setCustomSlug(e.target.value);
                      setSelectedKeyword(null);
                    }}
                    disabled={claiming}
                  />
                </div>
              ) : null}

              <button
                type="submit"
                className={styles.primaryButton}
                data-testid="claim-submit"
                disabled={claiming || (!selectedKeyword && !customSlug.trim())}
              >
                {claiming ? "Claiming…" : "Claim my variant"}
              </button>
            </div>
          ) : null}

          {!checking && availability && !availability.isOneWord && !availability.claimable ? (
            <p className={styles.error} role="alert">
              Everything for this name is taken right now. Try another profession or another name.
            </p>
          ) : null}

          {error ? (
            <p className={styles.error} role="alert" data-testid="claim-error">
              {error}
            </p>
          ) : null}
        </form>
      )}

      {recentClaims.length > 0 ? (
        <div className={styles.recent} data-testid="recent-claims">
          <h3>Claimed recently</h3>
          <ul>
            {recentClaims.map((c) => (
              <li key={c.slug}>
                <span className={styles.mono}>/{c.slug}</span>
                <span className={styles.ago}>{c.ago}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
