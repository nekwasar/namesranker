import { findNudgeCandidates } from "@/lib/onboarding";
import { sendEmail, onboardingNudgeEmail } from "@/lib/email";

/**
 * M5 deliverable: 24h onboarding nudge (spec §5.2 / §2.7).
 * Shared by `scripts/cron/nudges.ts` (manual/periodic run) and the protected
 * `POST /api/cron/nudges` endpoint (external cron → job, spec §3.13).
 */
export async function sendOnboardingNudges(): Promise<{
  candidates: number;
  sent: number;
  failed: number;
}> {
  const candidates = await findNudgeCandidates();

  let sent = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      await sendEmail(onboardingNudgeEmail(candidate.email, candidate.name, candidate.slug));
      sent++;
    } catch (err) {
      console.error(`Nudge failed for ${candidate.email}:`, err);
      failed++;
    }
  }

  return { candidates: candidates.length, sent, failed };
}
