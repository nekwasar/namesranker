import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import LogoutButton from "./logout-button";
import ManageBilling from "./manage-billing";
import MonitoringManager from "@/components/monitoring/monitoring-manager";
import SearchConsoleManager from "@/components/gsc/search-console-manager";

export const metadata: Metadata = {
  title: "Settings — NamesRanker",
  description: "Manage your NamesRanker account and content.",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const admin = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { isAdmin: true },
  });

  const [gscPages, searchConsole] = await Promise.all([
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

  return (
    <main>
      <h1>Settings</h1>
      <p>Signed in as {user.email}</p>
      <nav>
        <ul>
          <li>
            <Link href="/settings/user-data">Your data & content</Link>
          </li>
          <li>
            <Link href="/pricing">Plan & billing</Link>
          </li>
          {admin?.isAdmin ? (
            <li>
              <Link href="/admin">Admin</Link>
            </li>
          ) : null}
          <li>
            <LogoutButton />
          </li>
        </ul>
      </nav>
      <section style={{ marginTop: 32 }}>
        <h2>Plan</h2>
        <p>
          {user.plan === "PREMIUM" ? "You're on Premium." : "You're on the free plan."}{" "}
          {user.plan !== "PREMIUM" ? <Link href="/pricing">Upgrade</Link> : <ManageBilling />}
        </p>
      </section>
      <section style={{ marginTop: 32 }}>
        <MonitoringManager premium={user.plan === "PREMIUM"} />
      </section>
      <section style={{ marginTop: 32 }}>
        <SearchConsoleManager
          premium={user.plan === "PREMIUM"}
          initialLinks={gscLinks}
          pages={gscPages}
        />
      </section>
    </main>
  );
}
