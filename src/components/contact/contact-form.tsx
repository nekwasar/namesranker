"use client";

import { useState } from "react";
import styles from "./contact.module.css";

const SUBJECTS = ["General", "Support", "Press", "Billing", "Partnerships"];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many messages — please wait a few minutes and try again.");
        } else {
          setError(
            data?.error === "invalid_input"
              ? "Please check the form and try again."
              : "Something went wrong. Please try again."
          );
        }
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={styles.success} data-testid="contact-success">
        <h2 className={styles.successTitle}>Message sent</h2>
        <p className={styles.successBody}>
          Thanks, {name.split(" ")[0]}. We&rsquo;ve got your message and usually reply within one
          business day.
        </p>
        <button
          type="button"
          className={styles.successReset}
          data-testid="contact-reset"
          onClick={() => {
            setStatus("idle");
            setName("");
            setEmail("");
            setSubject(SUBJECTS[0]);
            setMessage("");
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} data-testid="contact-form" noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contact-name">
            Name
          </label>
          <input
            id="contact-name"
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            data-testid="contact-name"
            required
            minLength={2}
            maxLength={80}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contact-email">
            Email
          </label>
          <input
            id="contact-email"
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ada@example.com"
            data-testid="contact-email"
            required
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-subject">
          Subject
        </label>
        <select
          id="contact-subject"
          className={styles.input}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          data-testid="contact-subject"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-message">
          Message
        </label>
        <textarea
          id="contact-message"
          className={`${styles.input} ${styles.textarea}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          data-testid="contact-message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
        />
      </div>

      {status === "error" ? (
        <p className={styles.error} data-testid="contact-error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className={styles.submit}
        data-testid="contact-submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
