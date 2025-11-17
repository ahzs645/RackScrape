# RackScrape - Petro-Canada Rack Prices Scraper

Automated web scraper for collecting daily fuel pricing data from Petro-Canada's rack prices page. Built with Crawlee, Playwright, and TypeScript.

## Features

- **Automated Daily Scraping**: Scrapes all 4 pricing tables (Daily, Weekly Average, Twice-Weekly Average, Intra-Day)
- **28 Locations**: Covers all Canadian locations from Halifax to Nanaimo
- **9 Fuel Types**: REG 87, MID 89, SUP 91, REG E-10, MID E-5, ULS Diesel, ULSD#1, Furnace Oil, Stove Oil
- **Historical Data**: SQLite database stores all historical pricing data
- **Multiple Export Formats**: CSV, JSON, and Excel exports
- **Scheduling**: Automated daily runs via cron or GitHub Actions
- **Error Handling**: Comprehensive logging and retry mechanisms
- **Type Safety**: Full TypeScript implementation

## Project Structure

```
RackScrape/
├── src/
│   ├── main.ts                  # Main entry point
│   ├── routes.ts                # Crawlee route handlers
│   ├── scheduler.ts             # Cron-based scheduler
│   ├── types/
│   │   └── pricing.ts           # TypeScript interfaces
│   ├── config/
│   │   └── constants.ts         # Configuration constants
│   ├── utils/
│   │   ├── logger.ts            # Winston logger
│   │   ├── helpers.ts           # Utility functions
│   │   └── tableParser.ts       # HTML table parsing
│   ├── storage/
│   │   ├── database.ts          # SQLite operations
│   │   └── exporters.ts         # Export utilities
│   └── scripts/
│       └── export.ts            # Export script
├── database/
│   ├── schema.sql               # Database schema
│   └── prices.db                # SQLite database (generated)
├── storage/                     # Crawlee storage (auto-generated)
├── exports/                     # Exported data files
├── logs/                        # Application logs
├── .env                         # Environment variables
└── package.json
```

## Installation

### Quick Start with Docker (Recommended)

```bash
# 1. Clone or navigate to the project
cd RackScrape

# 2. Start with Docker Compose
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Check results
docker-compose exec rackscrape npm run query stats
```

See [DOCKER.md](DOCKER.md) for complete Docker documentation.

### Manual Installation

#### Prerequisites

- Node.js 16+
- npm or yarn

#### Setup

1. **Clone the repository**
   ```bash
   cd RackScrape
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

## Usage

### Run a Single Scrape

```bash
npm run scrape
```

This will:
- Scrape all 4 pricing tables
- Save data to the SQLite database
- Store JSON/CSV in `storage/datasets/`
- Log activity to `logs/`

### Run with Scheduling

#### Option 1: Node.js Scheduler (Recommended for local/VPS)

```bash
npm run schedule
```

This starts a persistent process that runs the scraper daily at the configured time (default: 3:30 AM EST).

#### Option 2: System Cron (Linux/Mac)

Add to your crontab:
```bash
crontab -e

# Add this line (adjust path):
30 3 * * * cd /path/to/RackScrape && npm run scrape >> logs/cron.log 2>&1
```

#### Option 3: GitHub Actions (Cloud-based)

The project includes a GitHub Actions workflow (`.github/workflows/daily-scrape.yml`) that:
- Runs daily at 3:30 AM EST automatically
- Stores results as artifacts
- Can be triggered manually

To use:
1. Push this repository to GitHub
2. Enable GitHub Actions in your repository settings
3. The workflow will run automatically

### Export Data

```bash
# Export all formats
npm run export

# Export specific format
npm run export csv
npm run export json
npm run export excel
npm run export latest

# Export location history
npm run export history "Toronto, ON" daily
```

Exports are saved to the `exports/` directory.

## Configuration

Edit `.env` to customize settings:

```env
# Scraping Schedule (cron format)
SCRAPE_SCHEDULE=30 3 * * *

# Timezone
TIMEZONE=America/New_York

# Browser Settings
HEADLESS=true
MAX_RETRIES=3
TIMEOUT_SECONDS=60

# Database
DATABASE_PATH=./database/prices.db

# Logging
LOG_LEVEL=info

# Optional: Run scrape on scheduler startup
RUN_ON_STARTUP=false
```

### Cron Schedule Examples

- `30 3 * * *` - Daily at 3:30 AM
- `0 */6 * * *` - Every 6 hours
- `0 9,17 * * 1-5` - 9 AM and 5 PM on weekdays

## Database

The scraper uses SQLite to store historical pricing data.

### Schema

**Tables:**
- `pricing_records` - All scraped pricing data
- `scrape_runs` - Scrape execution tracking

**Views:**
- `latest_prices` - Most recent prices by location and type
- `price_history` - Historical prices ordered by date

### Querying the Database

```bash
sqlite3 database/prices.db

# Get latest prices for Toronto
SELECT * FROM latest_prices WHERE location = 'Toronto, ON' AND rn = 1;

# Get price history for a location
SELECT * FROM price_history WHERE location = 'Vancouver, BC' AND pricing_type = 'daily';

# Get scrape statistics
SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 10;
```

## Data Formats

### CSV Export
Simple flat file with all pricing data:
```csv
pricing_type,location,effective_date,reg_87,mid_89,sup_91,...
daily,Toronto ON,2025-11-15,93.90,,111.40,...
```

### JSON Export
Structured data with metadata:
```json
{
  "tab": "daily",
  "pricingType": "daily",
  "effectiveDate": "Nov 15, 2025 12:00 AM",
  "recordsCount": 28,
  "records": [...]
}
```

### Excel Export
Multi-sheet workbook with formatted data:
- Sheet 1: Daily
- Sheet 2: Weekly Average
- Sheet 3: Twice-Weekly Average
- Sheet 4: Intra-Day

## Development

### Run in Development Mode

```bash
npm run dev
```

This runs with auto-reload on file changes.

### Project Scripts

```json
{
  "start": "tsx src/main.ts",          // Run scraper once
  "scrape": "tsx src/main.ts",         // Run scraper once
  "schedule": "tsx src/scheduler.ts",  // Start scheduler
  "export": "tsx src/scripts/export.ts", // Export data
  "dev": "tsx watch src/main.ts",      // Development mode
  "build": "tsc"                        // Compile TypeScript
}
```

## Logging

Logs are stored in the `logs/` directory:

- `combined.log` - All logs
- `error.log` - Error logs only

Log levels: `error`, `warn`, `info`, `debug`

## Troubleshooting

### Scraper fails to load page

- Check internet connection
- Verify the URL is still valid
- Try running with `HEADLESS=false` to see browser

### No data scraped

- The website structure may have changed
- Check logs for specific errors
- Verify selectors in `src/config/constants.ts`

### Database locked

- Close any SQLite connections
- Ensure only one scraper instance is running

### Playwright errors

```bash
# Reinstall browsers
npx playwright install --with-deps chromium
```

## Deployment

### Local/VPS Deployment

1. Clone repository on server
2. Install dependencies
3. Configure `.env`
4. Start scheduler: `npm run schedule`
5. Use PM2 or systemd to keep it running

**Using PM2:**
```bash
npm install -g pm2
pm2 start npm --name "rackscrape" -- run schedule
pm2 save
pm2 startup
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:20-slim
RUN npx playwright install --with-deps chromium
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "schedule"]
```

Build and run:
```bash
docker build -t rackscrape .
docker run -d -v $(pwd)/database:/app/database rackscrape
```

### GitHub Actions (Included)

The workflow automatically:
- Runs daily at 3:30 AM EST
- Saves exports and database as artifacts
- Can be triggered manually

## Data Sources

- **Source URL**: https://www.petro-canada.ca/en/business/rack-prices
- **Update Frequency**: Daily at ~3:00 AM EST/EDT
- **Pricing Types**: Daily, Weekly Average, Twice-Weekly Average, Intra-Day

## License

MIT

## Contributing

Contributions welcome! Please open an issue or pull request.

## Disclaimer

This scraper is for educational and personal use. Ensure compliance with Petro-Canada's terms of service and robots.txt. The authors are not responsible for any misuse of this tool.

## Support

For issues or questions, please open an issue on GitHub.
