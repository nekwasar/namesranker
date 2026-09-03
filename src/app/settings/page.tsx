import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { getEnvelope, ensureAgentState } from "@/lib/agent/state";
import {
  MemberShell,
  MemberPageHeader,
  MemberSectionBlock,
} from "@/components/member/member-shell";
import EnvelopeEditor from "@/components/member/envelope-editor";
import LogoutButton from "./logout-button";
import ManageBilling from "./manage-billing";
import MonitoringManager from "@/components/monitoring/monitoring-manager";
import SearchConsoleManager from "@/components/gsc/search-console-manager";
import styles from "./settings.module.css";

export const metadata: Metadata = {
  title: "Settings — NamesRanker",
  description: "Your account, plan and the rules your agent works by.",
};

export default async function SettingsPage() {
  const user = await requireUser();
  await ensureAgentState(user.sub);

  const [account, envelope, gscPages, searchConsole] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.sub },
      select: { firstName: true, lastName: true, email: true, isAdmin: true, createdAt: true },
    }),
    getEnvelope(user.sub),
    prisma.page.findMany({
      where: { ownerId: user.sub },
      select: { id: true, path: true, title: true },
    }),
    prisma.searchConsoleLink.findMany({
      where: { page: { ownerId: user.sub } },
      include: { page: { select: { path: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const gscLinks = searchConsole.map((l) => ({
    id: l.id,
    pageId: l.pageId,
    pagePath: l.page.path,
    pageTitle: l.page.title,
    propertyUrl: l.propertyUrl,
    lastImportAt: l.lastImportAt ? l.lastImportAt.toISOString() : null,
  }));

  const displayName =
    [account?.firstName, account?.lastName].filter(Boolean).join(" ") || user.email;
  const joined = account?.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <MemberShell active="settings" email={user.email}>
      <MemberPageHeader
        eyebrow="Settings"
        title="Settings"
        subtitle="Your account, your plan, and the permission envelope that tells your agent exactly what it may do for you."
      />

      <MemberSectionBlock title="Account" description="Who you are on NamesRanker.">
        <div className={styles.rows}>
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <p className={styles.rowTitle}>{displayName}</p>
              <p className={styles.rowSub}>
                {user.email} · member since {joined}
              </p>
            </div>
            <div className={styles.rowRight}>
              <LogoutButton />
            </div>
          </div>
        </div>
      </MemberSectionBlock>

      <MemberSectionBlock
        title="Plan & billing"
        description="One plan, full power. $1 unlocks 7 full days; from day 8 your plan continues automatically."
      >
        <div className={styles.rows}>
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <p className={styles.rowTitle}>
                {user.plan === "PREMIUM"
                  ? "You're on the full plan."
                  : "Your 7-day trial is not active yet."}
              </p>
              <p className={styles.rowSub}>
                {user.plan === "PREMIUM"
                  ? "Every feature is unlocked and your agent is working at full power."
                  : "Start the $1 trial to unlock 7 full days of your ranking agent — every feature, no limits."}
              </p>
            </div>
            <div className={styles.rowRight}>
              {user.plan === "PREMIUM" ? (
                <ManageBilling />
              ) : (
                <Link href="/pricing" className={styles.btn}>
                  Start your $1 trial
                </Link>
              )}
            </div>
          </div>
        </div>
      </MemberSectionBlock>

      <MemberSectionBlock
        title="Permissions — what your agent may do"
        description="The permission envelope. Your agent only ever acts inside these rules — tighten any area and it stops there immediately."
      >
        <EnvelopeEditor initial={envelope} />
      </MemberSectionBlock>

      <MemberSectionBlock
        title="Tools"
        description="The workspace tools your agent will absorb over the coming milestones — all still fully functional today."
      >
        <div className={styles.rows}>
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <p className={styles.rowTitle}>Your data &amp; content</p>
              <p className={styles.rowSub}>
                Edit your page content and SEO directly, manage sub-pages and connectors, export or
                delete your data.
              </p>
            </div>
            <Link href="/settings/user-data" className={styles.btnGhost}>
              Open tools
            </Link>
          </div>
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <p className={styles.rowTitle}>Name monitoring</p>
              <p className={styles.rowSub}>
                Watch variants of your name and get alerted the day a matching slug is claimed.
              </p>
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <p className={styles.rowTitle}>Search Console</p>
              <p className={styles.rowSub}>
                Connect a Search Console property and watch the queries, impressions and positions
                behind your name.
              </p>
            </div>
          </div>
          {account?.isAdmin ? (
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>Admin</p>
                <p className={styles.rowSub}>Approvals, claims and the audit log.</p>
              </div>
              <Link href="/admin" className={styles.btnGhost}>
                Open admin
              </Link>
            </div>
          ) : null}
        </div>
      </MemberSectionBlock>

      <div className={styles.managers}>
        <MonitoringManager premium={user.plan === "PREMIUM"} />
        <SearchConsoleManager
          premium={user.plan === "PREMIUM"}
          initialLinks={gscLinks}
          pages={gscPages}
        />
      </div>
    </MemberShell>
  );
}
