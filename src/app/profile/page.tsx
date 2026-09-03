import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { config } from "@/lib/config";
import {
  MemberShell,
  MemberPageHeader,
  MemberSectionBlock,
} from "@/components/member/member-shell";
import { ensureAgentState } from "@/lib/agent/state";
import styles from "./profile.module.css";

export const metadata: Metadata = {
  title: "Your profile — NamesRanker",
  description: "Your public hub and identity-web status.",
};

const CLAIM_STATUS_TEXT: Record<string, string> = {
  CLAIMED: "Claimed",
  PROTECTED: "Protected",
  PENDING_RELEASE: "Pending release",
  RELEASED: "Released",
};

const PAGE_STATUS_TEXT: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "In review",
  LIVE: "Live",
  REJECTED: "Rejected",
};

const CONNECTOR_TYPE_TEXT: Record<string, string> = {
  RSS: "Blog / RSS feed",
  GITHUB: "GitHub",
  YOUTUBE: "YouTube",
};

const ACTIVE_CLAIM_STATUSES = ["CLAIMED", "PROTECTED", "PENDING_RELEASE"] as const;

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function ProfilePage() {
  const session = await requireUser();
  await ensureAgentState(session.sub);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { firstName: true, lastName: true, profilePhotoUrl: true, createdAt: true },
  });

  const [claim, hubPages, syncedProfiles, published, watchedQueries, connectorAgg] =
    await Promise.all([
      prisma.nameClaim.findFirst({
        where: { claimedById: session.sub, status: { in: [...ACTIVE_CLAIM_STATUSES] } },
        orderBy: { claimedAt: "desc" },
        select: { slug: true, type: true, status: true, claimedAt: true, graceUntil: true },
      }),
      prisma.page.findMany({
        where: { ownerId: session.sub, isHub: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          path: true,
          status: true,
          descriptor: true,
          customDomain: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      prisma.syncedProfile.findMany({
        where: { userId: session.sub },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          platform: true,
          tier: true,
          displayName: true,
          url: true,
          status: true,
          lastSyncAt: true,
        },
      }),
      prisma.publishedItem.findMany({
        where: { userId: session.sub },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, platform: true, url: true, status: true, publishedAt: true },
      }),
      prisma.watchedQuery.findMany({
        where: { userId: session.sub, active: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          query: true,
          professionTagged: true,
          rankSnapshots: {
            orderBy: { capturedAt: "desc" },
            take: 1,
            select: { position: true, capturedAt: true, url: true },
          },
        },
      }),
      prisma.importConnector.groupBy({
        by: ["type"],
        where: { page: { ownerId: session.sub } },
        _count: { _all: true },
      }),
    ]);

  const hub = hubPages[0];
  const hubUrl = hub ? `https://${config.baseDomain}/${hub.path}` : null;
  const connectors = connectorAgg.map((c) => ({
    type: c.type as string,
    count: c._count._all,
  }));
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || session.email;

  return (
    <MemberShell active="profile" email={session.email}>
      <MemberPageHeader
        eyebrow="Your profile"
        title={displayName}
        subtitle="The public face of your identity web — your hub page plus every property Google uses to know who you are. Your agent builds and maintains this for you."
      />

      <MemberSectionBlock
        title="Your hub"
        description="Your permanent page on NamesRanker — the anchor every other surface links back to."
      >
        <div className={styles.rows}>
          {claim ? (
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>
                  {claim.slug}
                  {claim.type === "ONE_WORD"
                    ? " · one-word name"
                    : claim.type === "KEYWORD"
                      ? " · keyword variant"
                      : ""}
                </p>
                <p className={styles.rowSub}>
                  Claimed {formatDate(claim.claimedAt)}
                  {claim.graceUntil ? ` · protected until ${formatDate(claim.graceUntil)}` : ""}
                </p>
              </div>
              <span className={styles.pill}>{CLAIM_STATUS_TEXT[claim.status] ?? claim.status}</span>
            </div>
          ) : (
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>No name claimed yet</p>
                <p className={styles.rowSub}>
                  Your hub starts with a claim — it gives your page a permanent home and makes your
                  name the URL Google sees first.
                </p>
              </div>
              <Link href="/onboarding" className={styles.btn}>
                Claim your name
              </Link>
            </div>
          )}

          {hub ? (
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>
                  {hub.path}
                  {hub.descriptor ? (
                    <span className={styles.descriptor}> — {hub.descriptor}</span>
                  ) : null}
                </p>
                <p className={styles.rowSub}>
                  {hub.customDomain ? `Serving on ${hub.customDomain} · ` : ""}
                  {hub.publishedAt
                    ? `Live since ${formatDate(hub.publishedAt)}`
                    : `Created ${formatDate(hub.createdAt)}`}
                </p>
              </div>
              <div className={styles.rowActions}>
                {hub.status === "LIVE" && hubUrl ? (
                  <Link
                    href={hubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnGhost}
                  >
                    View page ↗
                  </Link>
                ) : (
                  <span className={`${styles.pill} ${styles.pillMuted}`}>
                    {PAGE_STATUS_TEXT[hub.status] ?? hub.status}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </MemberSectionBlock>

      <MemberSectionBlock
        title="Identity web"
        description="Every external property carrying your name, photo and descriptor — the more consistent they are, the faster Google forms one entity for you."
      >
        {syncedProfiles.length === 0 && connectors.length === 0 ? (
          <p className={styles.empty}>
            Nothing mapped yet. Your agent maps your existing footprint automatically once you
            upload your resume — until then, content sources you connect appear here too.
          </p>
        ) : (
          <div className={styles.rows}>
            {connectors.map((c) => (
              <div key={c.type} className={styles.row}>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>
                    {CONNECTOR_TYPE_TEXT[c.type] ?? c.type}
                    <span className={styles.mutedInline}> · content source</span>
                  </p>
                  <p className={styles.rowSub}>
                    {c.count} item{c.count === 1 ? "" : "s"} studied from this source.
                  </p>
                </div>
                <span className={styles.pill}>Studying</span>
              </div>
            ))}
            {syncedProfiles.map((p) => (
              <div key={p.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>
                    {p.platform}
                    <span className={styles.mutedInline}> · {p.tier} tier</span>
                  </p>
                  <p className={styles.rowSub}>{p.displayName ?? p.url ?? "—"}</p>
                </div>
                <span className={styles.pill}>{p.status.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </MemberSectionBlock>

      <MemberSectionBlock
        title="Ranking"
        description="The queries your name is being ranked for, with the latest Google position we've seen."
      >
        {watchedQueries.length === 0 ? (
          <p className={styles.empty}>
            No queries watched yet. Once your footprint exists, your agent watches “your name +
            profession” and reports movement here and in chat.
          </p>
        ) : (
          <div className={styles.rows}>
            {watchedQueries.map((q) => {
              const latest = q.rankSnapshots[0];
              return (
                <div key={q.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>
                      “{q.query}”
                      {q.professionTagged ? (
                        <span className={styles.mutedInline}> · profession-tagged</span>
                      ) : null}
                    </p>
                    <p className={styles.rowSub}>
                      {latest
                        ? `Last snapshot ${formatDate(latest.capturedAt)}`
                        : "No snapshot yet"}
                    </p>
                  </div>
                  <span
                    className={`${styles.position} ${latest?.position === 1 ? styles.positionFirst : ""}`}
                  >
                    {latest?.position != null ? `#${latest.position}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </MemberSectionBlock>

      <MemberSectionBlock
        title="Published"
        description="Every syndicated or placed copy of your work — each one canonical-linked back to your original."
      >
        {published.length === 0 ? (
          <p className={styles.empty}>
            Nothing published to external surfaces yet. Your agent starts republishing your works
            once your footprint is built — drafts land in chat for your approval first.
          </p>
        ) : (
          <div className={styles.rows}>
            {published.map((p) => (
              <div key={p.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>{p.platform}</p>
                  <p className={styles.rowSub}>{p.url ?? "URL pending"}</p>
                </div>
                <span className={styles.pill}>{p.status.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </MemberSectionBlock>

      <p className={styles.footnote}>
        Account created {formatDate(user?.createdAt ?? null)}. Something look off? Message your
        agent in <Link href="/chat">chat</Link>.
      </p>
    </MemberShell>
  );
}
