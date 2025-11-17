/**
 * Scheduler configuration types
 */

export interface ScheduleSettings {
  cronExpression: string;
  timezone: string;
  updatedAt?: string;
}

export interface ScheduleStatus extends ScheduleSettings {
  nextRun?: string | null;
  lastRun?: string | null;
  running: boolean;
}
