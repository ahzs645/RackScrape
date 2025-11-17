/**
 * Simple CLI for querying the database
 * Usage: npm run query <command> [args]
 */
import dotenv from 'dotenv';
import { initializeDatabase, getLatestPrices, getPriceHistory, getScrapeRunStats } from '../storage/database.js';
import { LOCATIONS } from '../config/constants.js';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  await initializeDatabase();

  switch (command) {
    case 'latest':
      const location = args[1];
      const pricingType = args[2] || 'daily';
      const latest = await getLatestPrices(location, pricingType);
      console.table(latest);
      break;

    case 'history':
      if (!args[1]) {
        console.error('Usage: npm run query history <location> [pricing-type]');
        process.exit(1);
      }
      const histLocation = args[1];
      const histType = args[2] || 'daily';
      const history = await getPriceHistory(histLocation, histType);
      console.table(history.slice(0, 10));
      console.log(`\nShowing 10 of ${history.length} records`);
      break;

    case 'stats':
      const stats = await getScrapeRunStats();
      console.log('\n=== Scrape Statistics ===');
      console.log(`Total scrapes: ${stats.total_runs || 0}`);
      console.log(`Completed: ${stats.completed_runs || 0}`);
      console.log(`Failed: ${stats.failed_runs || 0}`);
      console.log(`Total records: ${stats.total_records || 0}`);
      console.log(`Last run: ${stats.last_run_date || 'Never'}\n`);
      break;

    case 'locations':
      console.log('\n=== Available Locations ===');
      LOCATIONS.forEach((loc, i) => console.log(`${i + 1}. ${loc}`));
      console.log();
      break;

    default:
      console.log(`
RackScrape Query CLI

Usage:
  npm run query latest [location] [pricing-type]
    - Get latest prices for a location
    - Example: npm run query latest "Toronto, ON" daily

  npm run query history <location> [pricing-type]
    - Get price history for a location
    - Example: npm run query history "Vancouver, BC" daily

  npm run query stats
    - Show scrape run statistics

  npm run query locations
    - List all available locations

Pricing types: daily, weekly-average, twice-weekly-average, intra-day
      `);
  }
}

main().catch(console.error);
