/**
 * Export script - Run this to export data manually
 */
import dotenv from 'dotenv';
import { initializeDatabase } from '../storage/database.js';
import {
  exportLatestToCSV,
  exportLatestToJSON,
  exportToExcel,
  exportAllLatestToCSV,
  exportLocationHistory
} from '../storage/exporters.js';
import logger from '../utils/logger.js';

dotenv.config();

async function main() {
  try {
    logger.info('=== Starting Export Process ===');

    // Initialize database
    await initializeDatabase();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'all';

    switch (command) {
      case 'csv':
        logger.info('Exporting latest data to CSV...');
        await exportLatestToCSV();
        break;

      case 'json':
        logger.info('Exporting latest data to JSON...');
        await exportLatestToJSON();
        break;

      case 'excel':
        logger.info('Exporting to Excel...');
        await exportToExcel();
        break;

      case 'latest':
        logger.info('Exporting all latest prices to CSV...');
        await exportAllLatestToCSV();
        break;

      case 'history':
        if (args.length < 2) {
          console.error('Usage: npm run export history <location> [pricing-type]');
          process.exit(1);
        }
        const location = args[1];
        const pricingType = args[2] || 'daily';
        logger.info(`Exporting history for ${location} (${pricingType})...`);
        await exportLocationHistory(location, pricingType);
        break;

      case 'all':
      default:
        logger.info('Exporting all formats...');
        await exportLatestToCSV();
        await exportLatestToJSON();
        await exportToExcel();
        await exportAllLatestToCSV();
        break;
    }

    logger.info('=== Export Completed Successfully ===');
  } catch (error) {
    logger.error('Export failed:', error);
    process.exit(1);
  }
}

main();
