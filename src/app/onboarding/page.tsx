import { requireUser } from "@/lib/auth/require";

export const metadata = {
  title: "Claim your name — NamesRanker",
  description: "Claim your name before someone else does.",
};

export default async function OnboardingPage() {
  const user = await requireUser();

  return (
    <main>
      <h1>Claim your name</h1>
      <p>Signed in as {user.email}. Onboarding wizard arrives in M5.</p>
    </main>
  );
}
