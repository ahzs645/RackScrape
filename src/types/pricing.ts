/**
 * Pricing data types and interfaces
 */

export enum PricingType {
  DAILY = 'daily',
  WEEKLY = 'weekly-average',
  TWICE_WEEKLY = 'twice-weekly-average',
  INTRA_DAY = 'intra-day'
}

export interface PricingRecord {
  scrapeId: string;
  scrapeTimestamp: Date;
  effectiveDate: Date;
  pricingType: PricingType;
  location: string;
  reg87?: number;
  mid89?: number;
  sup91?: number;
  regE10?: number;
  midE5?: number;
  ulsDiesel?: number;
  ulsd1?: number;
  furnaceOil?: number;
  stove?: number;
}

export interface RawTableData {
  Location: string;
  'REG 87'?: string;
  'MID 89'?: string;
  'SUP 91'?: string;
  'REG E‑10'?: string;
  'MID E‑5'?: string;
  'ULS Diesel'?: string;
  'ULSD#1'?: string;
  'Furnace Oil'?: string;
  'STOVE'?: string;
  'Stove Oil'?: string;
}

export interface ScrapeRun {
  scrapeId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  recordsCount: number;
  errorMessage?: string;
}

export interface EffectiveDateInfo {
  dateString: string;
  parsedDate: Date;
  summary: string;
}
