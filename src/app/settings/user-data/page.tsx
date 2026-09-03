import { Metadata } from "next";
import { requireUser } from "@/lib/auth/require";
import { getSettingsData } from "@/lib/settings";
import { MemberShell, MemberPageHeader } from "@/components/member/member-shell";
import UserDataManager from "@/components/settings/user-data-manager";

export const metadata: Metadata = {
  title: "Your data — NamesRanker",
  description: "Manage your NamesRanker content, pages, and SEO.",
};

export default async function SettingsUserDataPage() {
  const user = await requireUser();
  const data = await getSettingsData(user.sub);

  return (
    <MemberShell active="settings" email={user.email}>
      <MemberPageHeader
        eyebrow="Tools"
        title="Your data & content"
        subtitle="Direct editing of your pages, content and SEO — your agent will take over most of this as the engine lands, but everything here stays fully functional."
      />
      <UserDataManager premium={user.plan === "PREMIUM"} initial={data} />
    </MemberShell>
  );
}
