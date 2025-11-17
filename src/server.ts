/**
 * Lightweight REST API + UI host for RackScrape
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  initializeDatabase,
  getLatestPrices,
  getPriceHistory,
  getScrapeRunStats,
  getScrapeRuns
} from './storage/database.js';
import {
  exportAllLatestToCSV,
  exportLocationHistory
} from './storage/exporters.js';
import { LOCATIONS } from './config/constants.js';
import { scheduleService } from './services/scheduleService.js';
import logger from './utils/logger.js';
import { PricingType } from './types/pricing.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const uiDistPath = join(rootDir, 'web', 'dist');

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/locations', (_req, res) => {
  res.json({ locations: LOCATIONS });
});

app.get('/api/prices/latest', async (req, res) => {
  try {
    const location = (req.query.location as string) || undefined;
    const pricingType = (req.query.pricingType as string) || undefined;
    const rows = await getLatestPrices(location, pricingType);
    res.json({ data: rows });
  } catch (error) {
    logger.error('Failed to fetch latest prices', error);
    res.status(500).json({ error: 'Failed to fetch latest prices' });
  }
});

app.get('/api/prices/history', async (req, res) => {
  try {
    const location = req.query.location as string;
    const pricingType = (req.query.pricingType as PricingType) || PricingType.DAILY;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    if (!location) {
      return res.status(400).json({ error: 'location is required' });
    }

    if (startDate && Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid startDate' });
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid endDate' });
    }

    const history = await getPriceHistory(location, pricingType, startDate, endDate);
    res.json({ data: history });
  } catch (error) {
    logger.error('Failed to fetch price history', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

app.get('/api/runs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const runs = await getScrapeRuns(limit);
    res.json({ data: runs });
  } catch (error) {
    logger.error('Failed to fetch scrape runs', error);
    res.status(500).json({ error: 'Failed to fetch scrape runs' });
  }
});

app.get('/api/runs/stats', async (_req, res) => {
  try {
    const stats = await getScrapeRunStats();
    res.json({ data: stats });
  } catch (error) {
    logger.error('Failed to fetch scrape run stats', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/schedule', (_req, res) => {
  try {
    const status = scheduleService.getStatus();
    res.json({ data: status });
  } catch (error) {
    logger.error('Failed to fetch schedule status', error);
    res.status(500).json({ error: 'Failed to fetch schedule status' });
  }
});

app.post('/api/schedule', async (req, res) => {
  try {
    const { cronExpression, timezone } = req.body;

    if (!cronExpression || !timezone) {
      return res.status(400).json({ error: 'cronExpression and timezone are required' });
    }

    const status = await scheduleService.updateSchedule(cronExpression, timezone);
    res.json({ data: status });
  } catch (error) {
    logger.error('Failed to update schedule', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid schedule' });
  }
});

app.post('/api/scrape/run', async (_req, res) => {
  scheduleService
    .triggerRun()
    .then(() => logger.info('Manual scrape queued'))
    .catch(err => logger.error('Manual scrape failed to queue', err));

  res.status(202).json({ message: 'Scrape triggered' });
});

app.get('/api/export/latest', async (_req, res) => {
  try {
    const filepath = await exportAllLatestToCSV();
    res.download(filepath);
  } catch (error) {
    logger.error('Failed to export latest prices', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

app.get('/api/export/location', async (req, res) => {
  try {
    const location = req.query.location as string;
    const pricingType = (req.query.pricingType as string) || PricingType.DAILY;

    if (!location) {
      return res.status(400).json({ error: 'location is required' });
    }

    const filepath = await exportLocationHistory(location, pricingType);
    res.download(filepath);
  } catch (error) {
    logger.error('Failed to export location history', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Serve built UI (if present)
if (existsSync(uiDistPath)) {
  app.use(express.static(uiDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(uiDistPath, 'index.html'));
  });
} else {
  logger.warn('UI bundle not found at web/dist - API only mode');
}

async function bootstrap() {
  await initializeDatabase();
  await scheduleService.start();

  const port = parseInt(process.env.PORT || '3000', 10);
  app.listen(port, () => {
    logger.info(`API server listening on port ${port}`);
  });
}

bootstrap().catch(error => {
  logger.error('Failed to start API server', error);
  process.exit(1);
});
