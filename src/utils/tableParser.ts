/**
 * Table parsing utilities
 */
import { Page } from 'playwright';
import { PricingRecord, PricingType, RawTableData, EffectiveDateInfo } from '../types/pricing.js';
import { CONFIG } from '../config/constants.js';
import { parsePrice, parseEffectiveDate } from './helpers.js';
import logger from './logger.js';

/**
 * Extract effective date information from a tab panel
 */
export async function extractEffectiveDate(page: Page, tabId: string): Promise<EffectiveDateInfo> {
  try {
    const selector = `#${tabId} ${CONFIG.selectors.effectiveDate}`;
    const dateText = await page.textContent(selector);

    if (!dateText) {
      throw new Error(`Could not find effective date for tab: ${tabId}`);
    }

    const parsedDate = parseEffectiveDate(dateText);

    // Also get the summary text
    const summarySelector = `#${tabId} ${CONFIG.selectors.effectiveDateSummary}`;
    const summary = await page.textContent(summarySelector) || '';

    return {
      dateString: dateText.trim(),
      parsedDate,
      summary: summary.trim()
    };
  } catch (error) {
    logger.error(`Error extracting effective date for ${tabId}:`, error);
    throw error;
  }
}

/**
 * Extract table data from a tab panel
 */
export async function extractTableData(page: Page, tabId: string): Promise<RawTableData[]> {
  try {
    const selector = `#${tabId} ${CONFIG.selectors.table}`;

    // Wait for table to be visible
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });

    const tableData = await page.evaluate((sel) => {
      const table = document.querySelector(sel);

      if (!table) {
        throw new Error('Table not found');
      }

      // Extract headers
      const headerCells = table.querySelectorAll('thead th');
      const headers = Array.from(headerCells).map(th => th.textContent?.trim() || '');

      // Extract rows
      const bodyRows = table.querySelectorAll('tbody tr');
      const rows = Array.from(bodyRows).map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const rowData: any = {};

        cells.forEach((cell, index) => {
          const header = headers[index];
          const value = cell.textContent?.trim() || '';
          rowData[header] = value;
        });

        return rowData;
      });

      return rows;
    }, selector);

    logger.info(`Extracted ${tableData.length} rows from ${tabId} table`);
    return tableData as RawTableData[];
  } catch (error) {
    logger.error(`Error extracting table data for ${tabId}:`, error);
    throw error;
  }
}

/**
 * Parse raw table data into structured pricing records
 */
export function parseTableToRecords(
  tableData: RawTableData[],
  effectiveDate: Date,
  pricingType: PricingType,
  scrapeId: string
): PricingRecord[] {
  const records: PricingRecord[] = [];
  const scrapeTimestamp = new Date();

  for (const row of tableData) {
    const record: PricingRecord = {
      scrapeId,
      scrapeTimestamp,
      effectiveDate,
      pricingType,
      location: row.Location,
      reg87: parsePrice(row['REG 87']),
      mid89: parsePrice(row['MID 89']),
      sup91: parsePrice(row['SUP 91']),
      regE10: parsePrice(row['REG E‑10']),
      midE5: parsePrice(row['MID E‑5']),
      ulsDiesel: parsePrice(row['ULS Diesel']),
      ulsd1: parsePrice(row['ULSD#1']),
      furnaceOil: parsePrice(row['Furnace Oil']),
      stove: parsePrice(row['STOVE'] || row['Stove Oil'])
    };

    // Only add records that have at least one price value
    const hasPriceData = [
      record.reg87, record.mid89, record.sup91, record.regE10, record.midE5,
      record.ulsDiesel, record.ulsd1, record.furnaceOil, record.stove
    ].some(price => price !== undefined);

    if (hasPriceData) {
      records.push(record);
    } else {
      logger.warn(`Skipping row with no price data: ${record.location}`);
    }
  }

  logger.info(`Parsed ${records.length} valid records`);
  return records;
}
