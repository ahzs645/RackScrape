/**
 * Configuration constants
 */

export const CONFIG = {
  // Target URL
  url: 'https://www.petro-canada.ca/en/business/rack-prices',

  // CSS Selectors
  selectors: {
    tabs: {
      daily: '#daily-link',
      weeklyAverage: '#weekly-average-link',
      twiceWeeklyAverage: '#twice-weekly-average-link',
      intraDay: '#intra-day-link'
    },
    tabPanels: {
      daily: '#daily',
      weeklyAverage: '#weekly-average',
      twiceWeeklyAverage: '#twice-weekly-average',
      intraDay: '#intra-day'
    },
    table: '.rack-pricing__table',
    effectiveDate: '.rack-pricing__effective-date',
    effectiveDateSummary: '.rack-pricing__effective-date-summary'
  },

  // Tab definitions
  tabs: [
    { id: 'daily', name: 'Daily' },
    { id: 'weekly-average', name: 'Weekly Average' },
    { id: 'twice-weekly-average', name: 'Twice-Weekly Average' },
    { id: 'intra-day', name: 'Intra-Day' }
  ],

  // Table column mappings
  columnMappings: {
    'Location': 'location',
    'REG 87': 'reg87',
    'MID 89': 'mid89',
    'SUP 91': 'sup91',
    'REG E‑10': 'regE10',
    'MID E‑5': 'midE5',
    'ULS Diesel': 'ulsDiesel',
    'ULSD#1': 'ulsd1',
    'Furnace Oil': 'furnaceOil',
    'STOVE': 'stove',
    'Stove Oil': 'stove'
  }
} as const;

export const LOCATIONS = [
  'Halifax, NS',
  'Charlottetown, PEI',
  'Saint John, NB',
  'Montreal, QC',
  'Quebec, QC',
  'Rimouski, QC',
  'Ottawa, ON',
  'Belleville, ON',
  'Toronto, ON',
  'Oakville, ON',
  'Hamilton, ON',
  'Nanticoke, ON',
  'London, ON',
  'Sarnia, ON',
  'Sault Ste. Marie, ON',
  'Thunder Bay, ON',
  'Edmonton, AB',
  'Winnipeg, MB',
  'Saskatoon, SK',
  'Regina, SK',
  'Calgary, AB',
  'Fort McMurray, AB',
  'Hay River, NWT',
  'Terrace, BC',
  'Prince George, BC',
  'Kamloops, BC',
  'Vancouver, BC',
  'Nanaimo, BC'
] as const;
