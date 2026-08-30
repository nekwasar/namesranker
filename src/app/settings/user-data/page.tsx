import { Metadata } from "next";
import { requireUser } from "@/lib/auth/require";
import { getSettingsData } from "@/lib/settings";
import UserDataManager from "@/components/settings/user-data-manager";

export const metadata: Metadata = {
  title: "Your data — NamesRanker",
  description: "Manage your NamesRanker content, pages, and SEO.",
};

export default async function SettingsUserDataPage() {
  const user = await requireUser();
  const data = await getSettingsData(user.sub);

  return (
    <main>
      <h1>Your data & content</h1>
      <p>Signed in as {user.email}</p>
      <UserDataManager premium={user.plan === "PREMIUM"} initial={data} />
    </main>
  );
}
