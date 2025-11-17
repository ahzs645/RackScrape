/**
 * Helper utility functions
 */
import { randomBytes } from 'crypto';

/**
 * Generate a unique scrape ID
 */
export function generateScrapeId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = randomBytes(4).toString('hex');
  return `scrape-${timestamp}-${random}`;
}

/**
 * Parse price string to number
 */
export function parsePrice(value: string | undefined | null): number | undefined {
  if (!value || value.trim() === '') {
    return undefined;
  }

  const cleaned = value.trim().replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Parse date from effective date string
 * Example: "Effective: Nov 15, 2025 12:00 AM"
 */
export function parseEffectiveDate(dateString: string): Date {
  // Remove "Effective: " prefix and extra whitespace
  const cleaned = dateString.replace(/^Effective:\s*/i, '').trim();

  const parsed = new Date(cleaned);

  if (isNaN(parsed.getTime())) {
    throw new Error(`Failed to parse date: ${dateString}`);
  }

  return parsed;
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate pricing record
 */
export function hasValidData(record: any): boolean {
  // Check if at least one price field has a value
  const priceFields = [
    'reg87', 'mid89', 'sup91', 'regE10', 'midE5',
    'ulsDiesel', 'ulsd1', 'furnaceOil', 'stove'
  ];

  return priceFields.some(field => record[field] !== undefined && record[field] !== null);
}
