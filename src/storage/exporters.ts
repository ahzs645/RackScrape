/**
 * Data export utilities for CSV and Excel formats
 */
import { Dataset } from 'crawlee';
import ExcelJS from 'exceljs';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getLatestPrices, getPriceHistory } from './database.js';
import { PricingRecord } from '../types/pricing.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');
const exportsDir = join(rootDir, 'exports');

// Ensure exports directory exists
if (!existsSync(exportsDir)) {
  mkdirSync(exportsDir, { recursive: true });
}

/**
 * Export latest scrape data to CSV using Crawlee's built-in functionality
 */
export async function exportLatestToCSV(): Promise<string> {
  try {
    const dataset = await Dataset.open();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rack-prices-${timestamp}.csv`;
    const filepath = join(exportsDir, filename);

    await dataset.exportToCSV(filename, {
      toKVS: exportsDir
    });

    logger.info(`Exported latest data to CSV: ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error('Error exporting to CSV:', error);
    throw error;
  }
}

/**
 * Export latest scrape data to JSON
 */
export async function exportLatestToJSON(): Promise<string> {
  try {
    const dataset = await Dataset.open();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rack-prices-${timestamp}.json`;
    const filepath = join(exportsDir, filename);

    await dataset.exportToJSON(filename, {
      toKVS: exportsDir
    });

    logger.info(`Exported latest data to JSON: ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error('Error exporting to JSON:', error);
    throw error;
  }
}

/**
 * Export data to Excel with multiple sheets
 */
export async function exportToExcel(data?: any[]): Promise<string> {
  try {
    const workbook = new ExcelJS.Workbook();

    // If no data provided, get latest prices from database
    if (!data) {
      const latestDaily = await getLatestPrices(undefined, 'daily');
      const latestWeekly = await getLatestPrices(undefined, 'weekly-average');
      const latestTwiceWeekly = await getLatestPrices(undefined, 'twice-weekly-average');
      const latestIntraDay = await getLatestPrices(undefined, 'intra-day');

      // Create sheets for each pricing type
      createPricingSheet(workbook, 'Daily', latestDaily);
      createPricingSheet(workbook, 'Weekly Average', latestWeekly);
      createPricingSheet(workbook, 'Twice-Weekly Average', latestTwiceWeekly);
      createPricingSheet(workbook, 'Intra-Day', latestIntraDay);
    }

    // Save workbook
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rack-prices-${timestamp}.xlsx`;
    const filepath = join(exportsDir, filename);

    await workbook.xlsx.writeFile(filepath);

    logger.info(`Exported data to Excel: ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error('Error exporting to Excel:', error);
    throw error;
  }
}

/**
 * Create a pricing sheet in the workbook
 */
function createPricingSheet(workbook: ExcelJS.Workbook, sheetName: string, data: any[]) {
  const sheet = workbook.addWorksheet(sheetName);

  // Define columns
  sheet.columns = [
    { header: 'Location', key: 'location', width: 25 },
    { header: 'Effective Date', key: 'effective_date', width: 15 },
    { header: 'REG 87', key: 'reg_87', width: 12 },
    { header: 'MID 89', key: 'mid_89', width: 12 },
    { header: 'SUP 91', key: 'sup_91', width: 12 },
    { header: 'REG E-10', key: 'reg_e10', width: 12 },
    { header: 'MID E-5', key: 'mid_e5', width: 12 },
    { header: 'ULS Diesel', key: 'uls_diesel', width: 12 },
    { header: 'ULSD #1', key: 'ulsd_1', width: 12 },
    { header: 'Furnace Oil', key: 'furnace_oil', width: 12 },
    { header: 'Stove', key: 'stove', width: 12 }
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };

  // Add data
  data.forEach(record => {
    sheet.addRow({
      location: record.location,
      effective_date: record.effective_date,
      reg_87: record.reg_87,
      mid_89: record.mid_89,
      sup_91: record.sup_91,
      reg_e10: record.reg_e10,
      mid_e5: record.mid_e5,
      uls_diesel: record.uls_diesel,
      ulsd_1: record.ulsd_1,
      furnace_oil: record.furnace_oil,
      stove: record.stove
    });
  });

  // Format number columns
  const numberColumns = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  numberColumns.forEach(col => {
    sheet.getColumn(col).numFmt = '0.00';
  });
}

/**
 * Export price history for a specific location to CSV
 */
export async function exportLocationHistory(
  location: string,
  pricingType: string = 'daily'
): Promise<string> {
  try {
    const history = await getPriceHistory(location, pricingType);

    // Convert to CSV
    const headers = [
      'effective_date',
      'location',
      'reg_87',
      'mid_89',
      'sup_91',
      'reg_e10',
      'mid_e5',
      'uls_diesel',
      'ulsd_1',
      'furnace_oil',
      'stove'
    ];

    const csvLines = [headers.join(',')];

    history.forEach((record: any) => {
      const row = headers.map(header => {
        const value = record[header];
        return value !== null && value !== undefined ? value : '';
      });
      csvLines.push(row.join(','));
    });

    const csv = csvLines.join('\n');

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeLocation = location.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `history-${safeLocation}-${pricingType}-${timestamp}.csv`;
    const filepath = join(exportsDir, filename);

    writeFileSync(filepath, csv, 'utf-8');

    logger.info(`Exported location history to CSV: ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error('Error exporting location history:', error);
    throw error;
  }
}

/**
 * Export all latest prices to a simple CSV format
 */
export async function exportAllLatestToCSV(): Promise<string> {
  try {
    const allPrices = await getLatestPrices();

    // Convert to CSV
    const headers = [
      'pricing_type',
      'location',
      'effective_date',
      'reg_87',
      'mid_89',
      'sup_91',
      'reg_e10',
      'mid_e5',
      'uls_diesel',
      'ulsd_1',
      'furnace_oil',
      'stove'
    ];

    const csvLines = [headers.join(',')];

    allPrices.forEach((record: any) => {
      const row = headers.map(header => {
        const value = record[header];
        return value !== null && value !== undefined ? value : '';
      });
      csvLines.push(row.join(','));
    });

    const csv = csvLines.join('\n');

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `latest-all-prices-${timestamp}.csv`;
    const filepath = join(exportsDir, filename);

    writeFileSync(filepath, csv, 'utf-8');

    logger.info(`Exported all latest prices to CSV: ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error('Error exporting all latest prices:', error);
    throw error;
  }
}
