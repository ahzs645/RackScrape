/**
 * Scheduler service that owns the cron task lifecycle
 */
import cron, { ScheduledTask } from 'node-cron';
import logger from '../utils/logger.js';
import { runScraper } from '../main.js';
import { getScheduleSettings, updateScheduleSettings } from '../storage/database.js';
import { ScheduleSettings, ScheduleStatus } from '../types/schedule.js';

class ScheduleService {
  private task: ScheduledTask | null = null;
  private isRunning = false;
  private settings: ScheduleSettings | null = null;

  /**
   * Start the scheduler with persisted settings
   */
  async start(): Promise<void> {
    this.settings = await getScheduleSettings();
    this.applySchedule(this.settings);
  }

  /**
   * Trigger a run manually
   */
  async triggerRun(): Promise<void> {
    await this.executeScrape('manual');
  }

  /**
   * Update cron expression/timezone
   */
  async updateSchedule(cronExpression: string, timezone: string): Promise<ScheduleStatus> {
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    this.settings = await updateScheduleSettings(cronExpression, timezone);
    this.applySchedule(this.settings);
    return this.getStatus();
  }

  /**
   * Get scheduler status for API
   */
  getStatus(): ScheduleStatus {
    return {
      cronExpression: this.settings?.cronExpression || '',
      timezone: this.settings?.timezone || '',
      updatedAt: this.settings?.updatedAt,
      nextRun: null, // node-cron does not expose next run; UI will infer from cron
      lastRun: null,
      running: this.isRunning
    };
  }

  /**
   * Tear down scheduled task
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  private applySchedule(settings: ScheduleSettings): void {
    if (!cron.validate(settings.cronExpression)) {
      logger.warn(
        `Invalid cron expression "${settings.cronExpression}", falling back to manual-only mode`
      );
      return;
    }

    // Stop previous task before starting a new one
    if (this.task) {
      this.task.stop();
    }

    this.task = cron.schedule(
      settings.cronExpression,
      async () => this.executeScrape('scheduled'),
      {
        timezone: settings.timezone,
        scheduled: true
      }
    );

    logger.info(
      `Scheduler armed with cron "${settings.cronExpression}" (${settings.timezone || 'UTC'})`
    );
  }

  private async executeScrape(kind: 'scheduled' | 'manual'): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scrape already running, skipping overlapping trigger');
      return;
    }

    this.isRunning = true;
    logger.info(`🚀 ${kind === 'scheduled' ? 'Scheduled' : 'Manual'} scrape starting`);

    try {
      await runScraper();
    } catch (error) {
      logger.error(`${kind} scrape failed`, error);
    } finally {
      this.isRunning = false;
    }
  }
}

export const scheduleService = new ScheduleService();
