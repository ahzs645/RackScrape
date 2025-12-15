/**
 * Database operations for storing and retrieving pricing data
 */
import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PricingRecord, ScrapeRun } from '../types/pricing.js';
import { ScheduleSettings } from '../types/schedule.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Ensure database directory exists
const dbDir = join(rootDir, 'database');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || join(dbDir, 'prices.db');
const defaultCron = process.env.SCRAPE_SCHEDULE || '30 3 * * *';
const defaultTimezone = process.env.TIMEZONE || 'America/New_York';

let db: Database | null = null;

/**
 * Get database connection (singleton)
 */
async function getDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  logger.info(`Database connection established: ${dbPath}`);
  return db;
}

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const database = await getDatabase();

    // Read schema file
    const schemaPath = join(rootDir, 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema
    await database.exec(schema);

    // Ensure default schedule exists
    await database.run(
      `INSERT OR IGNORE INTO schedule_settings (id, cron_expression, timezone, updated_at)
       VALUES (1, ?, ?, CURRENT_TIMESTAMP)`,
      [defaultCron, defaultTimezone]
    );

    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Start a new scrape run
 */
export async function startScrapeRun(scrapeId: string): Promise<void> {
  try {
    const database = await getDatabase();

    await database.run(
      `INSERT INTO scrape_runs (scrape_id, started_at, status, records_count)
       VALUES (?, ?, 'running', 0)`,
      [scrapeId, new Date().toISOString()]
    );

    logger.info(`Started scrape run: ${scrapeId}`);
  } catch (error) {
    logger.error('Error starting scrape run:', error);
    throw error;
  }
}

/**
 * Complete a scrape run
 */
export async function completeScrapeRun(
  scrapeId: string,
  recordsCount: number,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    const database = await getDatabase();

    await database.run(
      `UPDATE scrape_runs
       SET completed_at = ?, status = ?, records_count = ?, error_message = ?
       WHERE scrape_id = ?`,
      [new Date().toISOString(), status, recordsCount, errorMessage || null, scrapeId]
    );

    logger.info(`Completed scrape run: ${scrapeId} (${status})`);
  } catch (error) {
    logger.error('Error completing scrape run:', error);
    throw error;
  }
}

/**
 * Save pricing records to database
 */
export async function savePricingRecords(records: PricingRecord[]): Promise<void> {
  try {
    const database = await getDatabase();

    const stmt = await database.prepare(`
      INSERT INTO pricing_records (
        scrape_id, scrape_timestamp, effective_date, pricing_type, location,
        reg_87, mid_89, sup_91, reg_e10, mid_e5, uls_diesel, ulsd_1,
        furnace_oil, stove
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const record of records) {
      await stmt.run(
        record.scrapeId,
        record.scrapeTimestamp.toISOString(),
        record.effectiveDate.toISOString().split('T')[0], // Date only
        record.pricingType,
        record.location,
        record.reg87 ?? null,
        record.mid89 ?? null,
        record.sup91 ?? null,
        record.regE10 ?? null,
        record.midE5 ?? null,
        record.ulsDiesel ?? null,
        record.ulsd1 ?? null,
        record.furnaceOil ?? null,
        record.stove ?? null
      );
    }

    await stmt.finalize();

    logger.info(`Saved ${records.length} pricing records to database`);
  } catch (error) {
    logger.error('Error saving pricing records:', error);
    throw error;
  }
}

/**
 * Get latest prices for a location
 */
export async function getLatestPrices(location?: string, pricingType?: string) {
  try {
    const database = await getDatabase();

    let query = `
      SELECT * FROM latest_prices
      WHERE rn = 1
    `;
    const params: any[] = [];

    if (location) {
      query += ` AND location = ?`;
      params.push(location);
    }

    if (pricingType) {
      query += ` AND pricing_type = ?`;
      params.push(pricingType);
    }

    query += ` ORDER BY location, pricing_type`;

    const results = await database.all(query, params);
    return results;
  } catch (error) {
    logger.error('Error getting latest prices:', error);
    throw error;
  }
}

/**
 * Get price history for a location
 */
export async function getPriceHistory(
  location: string,
  pricingType: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const database = await getDatabase();

    let query = `
      SELECT * FROM pricing_records
      WHERE location = ? AND pricing_type = ?
    `;
    const params: any[] = [location, pricingType];

    if (startDate) {
      query += ` AND effective_date >= ?`;
      params.push(startDate.toISOString().split('T')[0]);
    }

    if (endDate) {
      query += ` AND effective_date <= ?`;
      params.push(endDate.toISOString().split('T')[0]);
    }

    query += ` ORDER BY effective_date DESC`;

    const results = await database.all(query, params);
    return results;
  } catch (error) {
    logger.error('Error getting price history:', error);
    throw error;
  }
}

/**
 * Get scrape run statistics
 */
export async function getScrapeRunStats() {
  try {
    const database = await getDatabase();

    const stats = await database.get(`
      SELECT
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_runs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
        SUM(records_count) as total_records,
        MAX(started_at) as last_run_date
      FROM scrape_runs
    `);

    return stats;
  } catch (error) {
    logger.error('Error getting scrape run stats:', error);
    throw error;
  }
}

/**
 * Get recent scrape runs
 */
export async function getScrapeRuns(limit: number = 50): Promise<any[]> {
  try {
    const database = await getDatabase();

    const runs = await database.all(
      `
      SELECT scrape_id, started_at, completed_at, status, records_count, error_message
      FROM scrape_runs
      ORDER BY started_at DESC
      LIMIT ?
    `,
      [limit]
    );

    return runs;
  } catch (error) {
    logger.error('Error getting scrape runs:', error);
    throw error;
  }
}

/**
 * Get persisted schedule settings
 */
export async function getScheduleSettings(): Promise<ScheduleSettings> {
  try {
    const database = await getDatabase();
    const row = await database.get(
      `
      SELECT cron_expression, timezone, updated_at
      FROM schedule_settings
      WHERE id = 1
    `
    );

    return {
      cronExpression: row?.cron_expression || defaultCron,
      timezone: row?.timezone || defaultTimezone,
      updatedAt: row?.updated_at
    };
  } catch (error) {
    logger.error('Error getting schedule settings:', error);
    throw error;
  }
}

/**
 * Update and persist schedule settings
 */
export async function updateScheduleSettings(
  cronExpression: string,
  timezone: string
): Promise<ScheduleSettings> {
  try {
    const database = await getDatabase();

    await database.run(
      `
      INSERT INTO schedule_settings (id, cron_expression, timezone, updated_at)
      VALUES (1, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        cron_expression = excluded.cron_expression,
        timezone = excluded.timezone,
        updated_at = CURRENT_TIMESTAMP
    `,
      [cronExpression, timezone]
    );

    return {
      cronExpression,
      timezone,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error updating schedule settings:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Get the database file path for export
 */
export function getDatabasePath(): string {
  return dbPath;
}

/**
 * Import database from uploaded file
 * This will close the current connection, replace the database file, and reinitialize
 */
export async function importDatabase(sourcePath: string): Promise<void> {
  try {
    // Close current connection
    await closeDatabase();

    // Copy the uploaded file to the database path
    const { copyFileSync, unlinkSync } = await import('fs');
    copyFileSync(sourcePath, dbPath);

    // Clean up the uploaded temp file
    try {
      unlinkSync(sourcePath);
    } catch {
      // Ignore cleanup errors
    }

    // Reinitialize the database connection
    await initializeDatabase();

    logger.info('Database imported successfully');
  } catch (error) {
    logger.error('Error importing database:', error);
    throw error;
  }
}

/**
 * Get database statistics for display
 */
export async function getDatabaseStats(): Promise<{
  totalRecords: number;
  totalRuns: number;
  oldestRecord: string | null;
  newestRecord: string | null;
  fileSizeBytes: number;
}> {
  try {
    const database = await getDatabase();
    const { statSync } = await import('fs');

    const recordCount = await database.get('SELECT COUNT(*) as count FROM pricing_records');
    const runCount = await database.get('SELECT COUNT(*) as count FROM scrape_runs');
    const oldest = await database.get('SELECT MIN(effective_date) as date FROM pricing_records');
    const newest = await database.get('SELECT MAX(effective_date) as date FROM pricing_records');

    let fileSize = 0;
    try {
      const stats = statSync(dbPath);
      fileSize = stats.size;
    } catch {
      // File might not exist yet
    }

    return {
      totalRecords: recordCount?.count || 0,
      totalRuns: runCount?.count || 0,
      oldestRecord: oldest?.date || null,
      newestRecord: newest?.date || null,
      fileSizeBytes: fileSize
    };
  } catch (error) {
    logger.error('Error getting database stats:', error);
    throw error;
  }
}
