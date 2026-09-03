"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./chat.module.css";

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface ApprovalRow {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  createdAt: string;
}

export interface WorkRow {
  id: string;
  action: string;
  status: string;
  createdAt: string;
}

const QUICK_PROMPTS = ["What's my status?", "What can you do?", "Show my permissions"];

const APPROVAL_KIND_LABELS: Record<string, string> = {
  publish: "Publish",
  pitch: "Pitch",
  transform: "Republish",
  "profile-change": "Profile change",
};

function approvalKindLabel(kind: string): string {
  return APPROVAL_KIND_LABELS[kind] ?? kind;
}

function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    "chat.message": "You sent a message",
    "envelope.update": "Permission envelope updated",
    "approval.approved": "Approved an item",
    "approval.rejected": "Rejected an item",
  };
  if (map[action]) return map[action];
  return action.replace(/\./g, " · ");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function ChatView({
  initialMessages,
  initialApprovals,
  initialWork,
  firstName,
}: {
  initialMessages: ChatMessage[];
  initialApprovals: ApprovalRow[];
  initialWork: WorkRow[];
  firstName: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [approvals, setApprovals] = useState<ApprovalRow[]>(initialApprovals);
  const [work, setWork] = useState<WorkRow[]>(initialWork);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages.length]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        throw new Error("send_failed");
      }
      const data = (await res.json()) as { user: ChatMessage; agent: ChatMessage };
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), data.user, data.agent]);
      setWork((w) => [
        {
          id: `chat-${Date.now()}`,
          action: "chat.message",
          status: "ok",
          createdAt: new Date().toISOString(),
        },
        ...w,
      ]);
    } catch {
      setError("Couldn't reach your agent — please try again in a moment.");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  async function decideApproval(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setApprovals((a) => a.filter((x) => x.id !== id));
        setWork((w) => [
          {
            id: `decide-${Date.now()}`,
            action: action === "approve" ? "approval.approved" : "approval.rejected",
            status: "ok",
            createdAt: new Date().toISOString(),
          },
          ...w,
        ]);
      }
    } catch {
      setError("Couldn't update that item — please try again.");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.thread} ref={threadRef} aria-live="polite">
        {messages.length === 0 ? (
          <p className={styles.threadEmpty}>
            Say hello{firstName ? `, ${firstName}` : ""} — your agent is listening.
          </p>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div
                key={m.id}
                className={`${styles.msg} ${styles.msgUser}`}
                data-testid="chat-user-msg"
              >
                <p className={styles.msgText}>{m.content}</p>
                <p className={styles.msgMeta}>{timeAgo(m.createdAt)}</p>
              </div>
            ) : (
              <div key={m.id} className={styles.msg} data-testid="chat-agent-msg">
                <p className={styles.msgLabel}>NamesRanker agent</p>
                <p className={styles.msgText}>{m.content}</p>
                <p className={styles.msgMeta}>{timeAgo(m.createdAt)}</p>
              </div>
            )
          )
        )}
        {sending ? (
          <div className={styles.msg}>
            <p className={styles.msgLabel}>NamesRanker agent</p>
            <p className={styles.msgTyping}>…</p>
          </div>
        ) : null}
      </div>

      <div className={styles.composerWrap}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.quickRow}>
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              className={styles.chip}
              disabled={sending}
              onClick={() => void send(q)}
            >
              {q}
            </button>
          ))}
        </div>
        <form className={styles.composer} onSubmit={onSubmit} data-testid="chat-composer">
          <textarea
            className={styles.input}
            value={input}
            rows={2}
            placeholder="Tell your agent what you need…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            disabled={sending}
            data-testid="chat-input"
          />
          <button
            type="submit"
            className={styles.send}
            disabled={sending || !input.trim()}
            data-testid="chat-send"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>

      <section className={styles.block} data-testid="chat-approvals">
        <h2 className={styles.blockTitle}>
          Needs your sign-off <span className={styles.count}>{approvals.length}</span>
        </h2>
        {approvals.length === 0 ? (
          <p className={styles.blockEmpty}>
            Nothing pending — I only ask when an action is worth your tap.
          </p>
        ) : (
          <ul className={styles.list}>
            {approvals.map((a) => (
              <li key={a.id} className={styles.approval}>
                <div className={styles.approvalMain}>
                  <p className={styles.approvalKind}>{approvalKindLabel(a.kind)}</p>
                  <p className={styles.approvalTitle}>{a.title}</p>
                  {a.summary ? <p className={styles.approvalSummary}>{a.summary}</p> : null}
                  <p className={styles.rowMeta}>{timeAgo(a.createdAt)}</p>
                </div>
                <div className={styles.approvalActions}>
                  <button
                    type="button"
                    className={styles.approve}
                    onClick={() => void decideApproval(a.id, "approve")}
                    data-testid="approval-approve"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={styles.reject}
                    onClick={() => void decideApproval(a.id, "reject")}
                    data-testid="approval-reject"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block} data-testid="chat-activity">
        <h2 className={styles.blockTitle}>Activity</h2>
        {work.length === 0 ? (
          <p className={styles.blockEmpty}>
            Everything I do is logged here — this feed will fill as I start working for you.
          </p>
        ) : (
          <ul className={styles.list}>
            {work.map((w) => (
              <li key={w.id} className={styles.activityRow}>
                <span className={styles.dot} aria-hidden="true" />
                <div>
                  <p className={styles.activityText}>{humanizeAction(w.action)}</p>
                  <p className={styles.rowMeta}>{timeAgo(w.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
