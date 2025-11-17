/**
 * Scheduler for automated daily scraping
 */
import cron from 'node-cron';
import dotenv from 'dotenv';
import { runScraper } from './main.js';
import logger from './utils/logger.js';

dotenv.config();

const schedule = process.env.SCRAPE_SCHEDULE || '30 3 * * *'; // Default: 3:30 AM
const timezone = process.env.TIMEZONE || 'America/New_York';

logger.info('=== Scheduler Starting ===');
logger.info(`Schedule: ${schedule} (${timezone})`);

// Validate cron expression
if (!cron.validate(schedule)) {
  logger.error(`Invalid cron expression: ${schedule}`);
  process.exit(1);
}

// Schedule the scraper
cron.schedule(
  schedule,
  async () => {
    logger.info('🕐 Scheduled scrape triggered');
    try {
      await runScraper();
      logger.info('✅ Scheduled scrape completed successfully');
    } catch (error) {
      logger.error('❌ Scheduled scrape failed:', error);
    }
  },
  {
    scheduled: true,
    timezone
  }
);

logger.info('✅ Scheduler is running. Press Ctrl+C to stop.');

// Run immediately on startup (optional)
if (process.env.RUN_ON_STARTUP === 'true') {
  logger.info('Running initial scrape on startup...');
  runScraper()
    .then(() => logger.info('Initial scrape completed'))
    .catch((error) => logger.error('Initial scrape failed:', error));
}

// Keep the process alive
process.stdin.resume();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Scheduler shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Scheduler shutting down...');
  process.exit(0);
});
