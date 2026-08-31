import "dotenv/config";
import { scanMonitoringAlerts } from "@/lib/claims/monitoring";

/**
 * Name-monitoring scan (spec §2.3, milestones §3.13): alerts premium users when
 * a slug matching a watched name is claimed. Run manually or via an external
 * cron (cron-job.org): `npm run cron:monitoring`.
 * (A protected trigger is also exposed at POST /api/cron/monitoring.)
 */
async function main() {
  const result = await scanMonitoringAlerts();
  console.log(
    `Checked ${result.rulesChecked} rule(s), sent ${result.alertsSent} alert(s), ${result.failed} failed.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
