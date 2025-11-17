/**
 * Test script to verify the scraper setup
 */
import dotenv from 'dotenv';
import { initializeDatabase, getScrapeRunStats } from '../storage/database.js';
import logger from '../utils/logger.js';

dotenv.config();

async function test() {
  console.log('=== RackScrape System Test ===\n');

  try {
    // Test 1: Database initialization
    console.log('✓ Testing database initialization...');
    await initializeDatabase();
    console.log('  ✅ Database initialized successfully\n');

    // Test 2: Check configuration
    console.log('✓ Checking configuration...');
    console.log(`  - Database path: ${process.env.DATABASE_PATH || 'default'}`);
    console.log(`  - Scrape schedule: ${process.env.SCRAPE_SCHEDULE || '30 3 * * *'}`);
    console.log(`  - Timezone: ${process.env.TIMEZONE || 'America/New_York'}`);
    console.log(`  - Headless mode: ${process.env.HEADLESS || 'true'}`);
    console.log('  ✅ Configuration loaded\n');

    // Test 3: Check scrape statistics
    console.log('✓ Checking scrape history...');
    const stats = await getScrapeRunStats();
    console.log(`  - Total scrapes: ${stats.total_runs || 0}`);
    console.log(`  - Completed: ${stats.completed_runs || 0}`);
    console.log(`  - Failed: ${stats.failed_runs || 0}`);
    console.log(`  - Total records: ${stats.total_records || 0}`);
    console.log(`  - Last run: ${stats.last_run_date || 'Never'}`);
    console.log('  ✅ Statistics retrieved\n');

    // Test 4: Logger test
    console.log('✓ Testing logger...');
    logger.info('Test log message');
    console.log('  ✅ Logger working\n');

    console.log('=== All Tests Passed! ===\n');
    console.log('Ready to scrape! Run:');
    console.log('  npm run scrape       - Run once');
    console.log('  npm run schedule     - Run on schedule');
    console.log('  npm run export       - Export data\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
