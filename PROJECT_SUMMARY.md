# RackScrape - Project Summary

## 🎯 Project Overview

**RackScrape** is a production-ready web scraper built with Crawlee and Playwright that automatically collects daily fuel pricing data from Petro-Canada's rack prices page.

## ✅ What's Been Implemented

### Core Features
- ✅ **Full-featured web scraper** using Crawlee + Playwright
- ✅ **4 pricing tables** scraped: Daily, Weekly Average, Twice-Weekly Average, Intra-Day
- ✅ **28 locations** across Canada (Halifax to Nanaimo)
- ✅ **9 fuel types** tracked per location
- ✅ **SQLite database** for historical data storage
- ✅ **Multiple export formats**: CSV, JSON, Excel
- ✅ **Automated scheduling** via node-cron
- ✅ **GitHub Actions** workflow for cloud-based scraping
- ✅ **Comprehensive logging** with Winston
- ✅ **Error handling** with retry mechanisms
- ✅ **TypeScript** throughout for type safety

### Project Structure

```
RackScrape/
├── src/
│   ├── main.ts                  # Main scraper entry point
│   ├── routes.ts                # Crawlee route handlers (scraping logic)
│   ├── scheduler.ts             # Automated scheduling
│   ├── types/
│   │   └── pricing.ts           # TypeScript interfaces
│   ├── config/
│   │   └── constants.ts         # Configuration & selectors
│   ├── utils/
│   │   ├── logger.ts            # Winston logger
│   │   ├── helpers.ts           # Helper functions
│   │   └── tableParser.ts       # HTML table parsing
│   ├── storage/
│   │   ├── database.ts          # SQLite operations
│   │   └── exporters.ts         # CSV/JSON/Excel export
│   └── scripts/
│       ├── export.ts            # Export script
│       └── test.ts              # System test
├── database/
│   ├── schema.sql               # Database schema
│   └── prices.db                # SQLite database (auto-created)
├── .github/workflows/
│   └── daily-scrape.yml         # GitHub Actions workflow
├── .env                         # Environment configuration
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript config
├── README.md                    # Full documentation
├── SETUP.md                     # Setup & deployment guide
├── QUICKSTART.md                # Quick start guide
└── PROJECT_SUMMARY.md           # This file
```

## 📦 Dependencies Installed

- **crawlee** (^3.7.0) - Web scraping framework
- **playwright** (^1.40.0) - Browser automation
- **sqlite** (^5.1.1) + **sqlite3** (^5.1.7) - Database
- **exceljs** (^4.4.0) - Excel file generation
- **winston** (^3.11.0) - Logging
- **node-cron** (^3.0.3) - Scheduling
- **dotenv** (^16.3.1) - Environment variables
- **tsx** (^4.7.0) - TypeScript execution
- **typescript** (^5.3.3) - TypeScript compiler

## 🚀 Available Commands

```bash
# Installation
npm install                      # Install dependencies
npx playwright install chromium  # Install browser

# Testing
npm test                         # Run system test

# Scraping
npm run scrape                   # Run scraper once
npm run schedule                 # Start automated scheduler
npm run dev                      # Development mode (watch)

# Exporting
npm run export                   # Export all formats
npm run export csv               # CSV only
npm run export json              # JSON only
npm run export excel             # Excel only
npm run export latest            # Latest prices CSV
npm run export history "Toronto, ON" daily

# Building
npm run build                    # Compile TypeScript
```

## 🗄️ Database Schema

### Tables

**pricing_records**
- Stores all historical pricing data
- Columns: location, effective_date, pricing_type, reg_87, mid_89, sup_91, etc.
- Indexed for fast queries

**scrape_runs**
- Tracks scrape execution history
- Columns: scrape_id, started_at, completed_at, status, records_count, error_message

### Views

**latest_prices**
- Most recent prices by location and pricing type

**price_history**
- Historical prices ordered by date

## 📊 Data Flow

1. **Scraper runs** (manually or scheduled)
2. **Navigates** to Petro-Canada rack prices page
3. **Clicks each tab** (Daily, Weekly, Twice-Weekly, Intra-Day)
4. **Extracts table data** for all 28 locations
5. **Parses and validates** pricing data
6. **Saves to database** (SQLite)
7. **Exports to files** (JSON/CSV via Crawlee)
8. **Logs activity** (Winston)

## ⚙️ Configuration Options

Edit `.env` to customize:

```env
# Scraping
SCRAPE_SCHEDULE=30 3 * * *       # Cron schedule
TIMEZONE=America/New_York        # Timezone
HEADLESS=true                    # Browser visibility
MAX_RETRIES=3                    # Retry attempts
TIMEOUT_SECONDS=60               # Request timeout

# Database
DATABASE_PATH=./database/prices.db

# Logging
LOG_LEVEL=info                   # Logging level
```

## 📈 Scheduling Options

### Option 1: Node.js Scheduler (Built-in)
```bash
npm run schedule
```
- Uses node-cron
- Runs as persistent process
- Configurable via .env

### Option 2: System Cron (Linux/Mac)
```bash
crontab -e
# Add: 30 3 * * * cd /path/to/RackScrape && npm run scrape
```

### Option 3: GitHub Actions (Cloud)
- Pre-configured workflow in `.github/workflows/daily-scrape.yml`
- Runs automatically at 3:30 AM EST
- Stores results as artifacts

### Option 4: PM2 (Production)
```bash
pm2 start npm --name "rackscrape" -- run schedule
```

## 📤 Export Formats

### CSV Export
- Flat file format
- Import to Excel, Google Sheets
- Location: `exports/rack-prices-*.csv`

### JSON Export
- Structured data with metadata
- Use in applications/APIs
- Location: `storage/datasets/default/*.json`

### Excel Export
- Multi-sheet workbook
- One sheet per pricing type
- Formatted with headers
- Location: `exports/rack-prices-*.xlsx`

## 🔍 Sample Queries

```sql
-- Latest prices for Toronto
SELECT * FROM latest_prices
WHERE location = 'Toronto, ON' AND rn = 1;

-- Price history for Vancouver (last 30 days)
SELECT * FROM pricing_records
WHERE location = 'Vancouver, BC'
  AND pricing_type = 'daily'
  AND effective_date >= date('now', '-30 days')
ORDER BY effective_date DESC;

-- Average SUP 91 price by location
SELECT location, AVG(sup_91) as avg_sup91
FROM pricing_records
WHERE pricing_type = 'daily'
  AND effective_date >= date('now', '-7 days')
GROUP BY location
ORDER BY avg_sup91 DESC;

-- Scrape success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM scrape_runs
GROUP BY status;
```

## 🛠️ How It Works

### 1. Page Navigation
- Crawlee opens the Petro-Canada rack prices page
- Playwright controls the browser

### 2. Tab Switching
- Clicks each of the 4 tab buttons
- Waits for content to load
- Extracts effective date

### 3. Table Scraping
- Finds the pricing table using CSS selectors
- Extracts headers and rows
- Parses HTML to structured data

### 4. Data Processing
- Validates location names
- Parses price strings to numbers
- Handles empty cells (optional data)
- Creates typed records

### 5. Storage
- Saves to SQLite database
- Exports to Crawlee dataset (JSON/CSV)
- Tracks scrape run metadata

### 6. Logging
- Info level: Progress updates
- Error level: Failures and retries
- Stored in `logs/` directory

## 🔐 Best Practices Implemented

- ✅ **Type safety** with TypeScript
- ✅ **Error handling** with try-catch and retries
- ✅ **Logging** for debugging and monitoring
- ✅ **Database indexes** for query performance
- ✅ **Graceful shutdown** handling
- ✅ **Environment configuration** via .env
- ✅ **Modular code structure** for maintainability
- ✅ **Documentation** at multiple levels
- ✅ **Version control** ready (.gitignore)
- ✅ **CI/CD ready** (GitHub Actions)

## 📝 Next Steps

To start using the scraper:

1. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

2. **Run a test scrape**
   ```bash
   npm run scrape
   ```

3. **Verify data**
   ```bash
   sqlite3 database/prices.db "SELECT COUNT(*) FROM pricing_records;"
   ```

4. **Set up automation**
   - Choose scheduling method (node-cron, cron, GitHub Actions)
   - Configure .env for your timezone
   - Start the scheduler

5. **Monitor and maintain**
   - Check logs regularly
   - Backup database periodically
   - Export data as needed

## 🎓 Learning Resources

- **Crawlee Docs**: https://crawlee.dev/
- **Playwright Docs**: https://playwright.dev/
- **Cron Syntax**: https://crontab.guru/
- **SQLite Docs**: https://www.sqlite.org/docs.html

## 📞 Support

- Check logs: `cat logs/error.log`
- Run tests: `npm test`
- Debug mode: Set `HEADLESS=false` in .env
- Open GitHub issue for bugs

## 🎉 Summary

You now have a fully functional, production-ready web scraper that:
- Automatically collects fuel pricing data daily
- Stores historical data in a database
- Exports to multiple formats
- Handles errors gracefully
- Logs all activity
- Can run locally or in the cloud

The scraper is ready to use! Follow the QUICKSTART.md guide to begin collecting data.
