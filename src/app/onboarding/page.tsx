import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require";
import { getOnboardingState, getPreviewData, ONBOARDING_STEPS } from "@/lib/onboarding";
import NameClaimForm from "@/components/claims/name-claim-form";
import OnboardingWizard from "@/components/onboarding/onboarding-wizard";
import styles from "./onboarding.module.css";

export const metadata = {
  title: "Claim your name — NamesRanker",
  description: "Claim your name before someone else does.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { step?: string };
}) {
  const user = await requireUser();
  const state = await getOnboardingState(user.sub);

  // Wizard completed → returning users land in Settings (spec §9).
  if (state.completed) {
    redirect("/settings");
  }

  // Explicit ?step= wins; otherwise resume at the first incomplete step.
  const paramStep = Number(searchParams?.step);
  let step = state.step;
  if (Number.isInteger(paramStep) && paramStep >= 1 && paramStep <= ONBOARDING_STEPS) {
    step = paramStep;
  }
  // A claim already exists → step 1 is done. No claim → only step 1 is reachable.
  if (state.claim && step === 1) step = 2;
  if (!state.claim && step > 1) step = 1;

  return (
    <main className={styles.page}>
      <h1>Claim your name</h1>
      <p>
        Signed in as <strong>{user.email}</strong>. Your name is searchable — make it yours.
      </p>

      {step === 1 ? (
        <>
          <p className={styles.stepNote}>Step 1 of 7 — your name is searchable. Make it yours.</p>
          <NameClaimForm premium={user.plan === "PREMIUM"} />
        </>
      ) : state.claim ? (
        <OnboardingWizard
          step={step}
          initial={
            (await getPreviewData(user.sub)) ?? {
              name: state.name,
              path: state.claim.slug,
              descriptor: null,
              photoUrl: null,
              bio: null,
              socials: [],
              experience: [],
              projects: [],
              publications: [],
              testimonials: [],
              connectors: [],
            }
          }
        />
      ) : null}
    </main>
  );
}
