// CLI entry to run the full automation pipeline once (for cron / manual runs).
// Usage: npm run cron:pipeline
import { runFullPipeline, generateDailyReport } from '../src/server/services/pipeline';

(async () => {
  const result = await runFullPipeline();
  const report = await generateDailyReport();
  console.log('Pipeline result:', JSON.stringify(result, null, 2));
  console.log('Daily report:', JSON.stringify(report, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
