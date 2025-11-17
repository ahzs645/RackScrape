/**
 * Main entry point for the Petro-Canada rack prices scraper
 */
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { router } from './routes.js';
import { initializeDatabase, closeDatabase } from './storage/database.js';
import { CONFIG } from './config/constants.js';
import logger from './utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main scraper function
 */
export async function runScraper() {
  try {
    logger.info('=== Petro-Canada Rack Prices Scraper Started ===');

    // Initialize database
    await initializeDatabase();

    // Configure crawler
    const crawler = new PlaywrightCrawler({
      requestHandler: router,

      // Browser settings
      headless: process.env.HEADLESS !== 'false',
      launchContext: {
        launchOptions: {
          timeout: 60000
        }
      },

      // Request settings
      maxRequestRetries: parseInt(process.env.MAX_RETRIES || '3'),
      requestHandlerTimeoutSecs: parseInt(process.env.TIMEOUT_SECONDS || '120'),
      navigationTimeoutSecs: parseInt(process.env.TIMEOUT_SECONDS || '60'),

      // Concurrency (only scraping one page, so keep it simple)
      maxConcurrency: 1,

      // Failed request handler
      failedRequestHandler: async ({ request, log }, error) => {
        log.error(`Request ${request.url} failed after ${request.retryCount} retries:`, error);
        logger.error(`Request failed: ${request.url}`, { error: error.message });
      },

      // Pre-navigation hook
      preNavigationHooks: [
        async ({ page, request, log }) => {
          log.info(`Navigating to ${request.url}`);

          // Set extra HTTP headers to appear more like a real browser
          await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          });
        }
      ],

      // Post-navigation hook
      postNavigationHooks: [
        async ({ page, log }) => {
          log.info('Page navigation completed');

          // Take a screenshot for debugging (optional)
          if (process.env.NODE_ENV === 'development') {
            await page.screenshot({ path: 'storage/screenshot.png', fullPage: false });
            log.info('Screenshot saved');
          }
        }
      ]
    });

    // Run the crawler
    logger.info(`Starting crawl: ${CONFIG.url}`);
    await crawler.run([CONFIG.url]);

    logger.info('=== Scraper Completed Successfully ===');
  } catch (error) {
    logger.error('Fatal error in scraper:', error);
    throw error;
  } finally {
    // Close database connection
    await closeDatabase();
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runScraper()
    .then(() => {
      logger.info('Scraper finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Scraper failed:', error);
      process.exit(1);
    });
}
