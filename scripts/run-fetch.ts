// CLI entry to fetch all active sources once. Usage: npm run cron:fetch
import { fetchAllSources } from '../src/server/services/fetcher';

(async () => {
  const summary = await fetchAllSources();
  console.log('Fetch summary:', JSON.stringify(summary, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
