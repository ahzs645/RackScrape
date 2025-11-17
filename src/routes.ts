/**
 * Crawlee route handlers
 */
import { createPlaywrightRouter, Dataset } from 'crawlee';
import { PricingType } from './types/pricing.js';
import { CONFIG } from './config/constants.js';
import { extractEffectiveDate, extractTableData, parseTableToRecords } from './utils/tableParser.js';
import { generateScrapeId, delay } from './utils/helpers.js';
import { savePricingRecords, startScrapeRun, completeScrapeRun } from './storage/database.js';
import logger from './utils/logger.js';

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ page, log, request }) => {
  log.info(`Starting scrape: ${request.url}`);

  const scrapeId = generateScrapeId();
  let totalRecords = 0;

  try {
    // Start scrape run tracking
    await startScrapeRun(scrapeId);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    log.info('Page loaded successfully');

    // Get dataset for this scrape
    const dataset = await Dataset.open();

    // Define tabs to scrape
    const tabs = [
      { id: 'daily', type: PricingType.DAILY },
      { id: 'weekly-average', type: PricingType.WEEKLY },
      { id: 'twice-weekly-average', type: PricingType.TWICE_WEEKLY },
      { id: 'intra-day', type: PricingType.INTRA_DAY }
    ];

    // Scrape each tab
    for (const tab of tabs) {
      try {
        log.info(`Processing tab: ${tab.id}`);

        // Click tab button
        const tabButtonSelector = `#${tab.id}-link`;
        await page.click(tabButtonSelector);
        log.info(`Clicked tab button: ${tabButtonSelector}`);

        // Wait for tab panel to become visible
        const tabPanelSelector = `#${tab.id}[aria-hidden="false"]`;
        await page.waitForSelector(tabPanelSelector, { timeout: 10000 });
        log.info(`Tab panel visible: ${tabPanelSelector}`);

        // Small delay to ensure content is fully rendered
        await delay(500);

        // Extract effective date
        const effectiveDateInfo = await extractEffectiveDate(page, tab.id);
        log.info(`Effective date: ${effectiveDateInfo.dateString}`);

        // Extract table data
        const tableData = await extractTableData(page, tab.id);
        log.info(`Extracted ${tableData.length} rows from table`);

        // Parse table to records
        const records = parseTableToRecords(
          tableData,
          effectiveDateInfo.parsedDate,
          tab.type,
          scrapeId
        );

        log.info(`Parsed ${records.length} valid records`);

        // Save to Crawlee dataset (automatic JSON/CSV export)
        await dataset.pushData({
          tab: tab.id,
          pricingType: tab.type,
          effectiveDate: effectiveDateInfo.dateString,
          summary: effectiveDateInfo.summary,
          recordsCount: records.length,
          records
        });

        // Save to database
        await savePricingRecords(records);

        totalRecords += records.length;

        log.info(`Successfully processed ${tab.id}: ${records.length} records`);
      } catch (error) {
        log.error(`Error processing tab ${tab.id}:`, error);
        // Continue with other tabs even if one fails
        throw error;
      }
    }

    // Mark scrape as completed
    await completeScrapeRun(scrapeId, totalRecords, 'completed');

    log.info(`Scrape completed successfully: ${scrapeId} (${totalRecords} total records)`);
    logger.info(`Scrape completed: ${scrapeId} - ${totalRecords} records`);

  } catch (error) {
    log.error('Scrape failed:', error);
    logger.error('Scrape failed:', error);

    // Mark scrape as failed
    await completeScrapeRun(
      scrapeId,
      totalRecords,
      'failed',
      error instanceof Error ? error.message : String(error)
    );

    throw error;
  }
});
