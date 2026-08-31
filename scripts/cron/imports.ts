import "dotenv/config";
import { syncAutoConnectors } from "@/lib/imports/imports";

/**
 * M7: import-connector auto-sync (premium, spec §5.1 / milestones §3.8).
 * Fetches RSS/GitHub/YouTube content for every connector with autoSync=true.
 * Run manually or via an external cron (cron-job.org):
 *   npm run cron:imports
 * (A protected trigger is also exposed at POST /api/cron/imports.)
 */
async function main() {
  const result = await syncAutoConnectors();
  console.log(`Synced ${result.synced} connector(s), ${result.failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
