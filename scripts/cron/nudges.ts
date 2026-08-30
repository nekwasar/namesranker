import "dotenv/config";
import { sendOnboardingNudges } from "@/lib/nudges";

/**
 * M5: 24h onboarding nudge (spec §5.2 / §2.7).
 * Users who claimed a name 24–48h ago but haven't finished the wizard get one
 * nudge email. Run manually or via an external cron (cron-job.org):
 *   npm run cron:nudges
 * (A protected trigger is also exposed at POST /api/cron/nudges.)
 */
async function main() {
  const result = await sendOnboardingNudges();
  console.log(`Sent ${result.sent}/${result.candidates} nudge email(s), ${result.failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
