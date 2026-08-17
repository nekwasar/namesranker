import { Metadata } from "next";
import { requireUser } from "@/lib/auth/require";

export const metadata: Metadata = {
  title: "Your data — NamesRanker",
  description: "Manage your NamesRanker content and sections.",
};

export default async function SettingsUserDataPage() {
  const user = await requireUser();

  return (
    <main>
      <h1>Your data & content</h1>
      <p>Signed in as {user.email} — full content management arrives in M6.</p>
    </main>
  );
}
