import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require";
import AdminConsole from "./admin-console";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Admin — NamesRanker",
  description: "Moderation, approvals, and audit for NamesRanker.",
};

export default async function AdminPage() {
  const admin = await requireAdmin();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Admin</h1>
          <p className={styles.hint}>
            Signed in as {admin.email} · moderation actions are audited.
          </p>
        </div>
        <Link href="/settings" className={styles.link}>
          ← Back to settings
        </Link>
      </header>
      <AdminConsole />
    </main>
  );
}
