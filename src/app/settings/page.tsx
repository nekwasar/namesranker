import { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import LogoutButton from "./logout-button";
import MonitoringManager from "@/components/monitoring/monitoring-manager";

export const metadata: Metadata = {
  title: "Settings — NamesRanker",
  description: "Manage your NamesRanker account and content.",
};

export default async function SettingsPage() {
  const user = await requireUser();

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
          <li>
            <LogoutButton />
          </li>
        </ul>
      </nav>
      <section style={{ marginTop: 32 }}>
        <MonitoringManager premium={user.plan === "PREMIUM"} />
      </section>
    </main>
  );
}
