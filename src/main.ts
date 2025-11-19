/**
 * Main entry point for the Petro-Canada rack prices scraper
 */
import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
import { initializeDatabase, closeDatabase, startScrapeRun, completeScrapeRun } from './storage/database.js';
import { CONFIG } from './config/constants.js';
import { generateScrapeId } from './utils/helpers.js';
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

      // Browser settings with anti-detection
      headless: process.env.HEADLESS !== 'false',
      launchContext: {
        launchOptions: {
          timeout: 60000,
          // Additional args to avoid detection
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        },
        // Use realistic browser context
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
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

        // Record failed scrape to database
        try {
          const scrapeId = generateScrapeId();
          await startScrapeRun(scrapeId);
          await completeScrapeRun(
            scrapeId,
            0,
            'failed',
            error instanceof Error ? error.message : String(error)
          );
          logger.info(`Recorded failed scrape run: ${scrapeId}`);
        } catch (dbError) {
          logger.error('Error recording failed scrape:', dbError);
        }
      },

      // Pre-navigation hook
      preNavigationHooks: [
        async ({ page, request, log }) => {
          log.info(`Navigating to ${request.url}`);

          // Remove webdriver flag and other automation indicators
          await page.addInitScript(() => {
            // Override the navigator.webdriver flag
            Object.defineProperty(navigator, 'webdriver', {
              get: () => undefined
            });

            // Override permissions API
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters: any) => (
              parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission } as PermissionStatus) :
                originalQuery(parameters)
            );

            // Add Chrome runtime
            (window as any).chrome = {
              runtime: {}
            };

            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
              get: () => [1, 2, 3, 4, 5]
            });

            // Mock languages
            Object.defineProperty(navigator, 'languages', {
              get: () => ['en-US', 'en']
            });
          });

          // Set extra HTTP headers to appear more like a real browser
          await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
          });

          // Set viewport to common desktop size
          await page.setViewportSize({ width: 1920, height: 1080 });
        }
      ],

      // Post-navigation hook
      postNavigationHooks: [
        async ({ page, log }) => {
          log.info('Page navigation completed');

          // Small random delay to simulate human behavior
          const delay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms
          await page.waitForTimeout(delay);

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
