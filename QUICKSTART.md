# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Playwright Browsers

```bash
npx playwright install chromium
```

### Step 2: Run Your First Scrape

```bash
npm run scrape
```

That's it! The scraper will:
- Visit the Petro-Canada rack prices page
- Click through all 4 pricing tabs
- Extract data from 28 locations
- Save to SQLite database
- Export to JSON/CSV

### Step 3: Check Your Data

```bash
# View in terminal
sqlite3 database/prices.db "SELECT * FROM latest_prices LIMIT 5;"

# Export to Excel/CSV
npm run export
```

## 📊 What You'll Get

After running the scraper, you'll have:

### Database
- `database/prices.db` - SQLite database with all historical data
- Query anytime with SQL

### Exports (in `exports/` folder)
- CSV files - Import to Excel, Google Sheets
- JSON files - Use in applications
- Excel files - Formatted workbooks with all tabs

### Logs (in `logs/` folder)
- `combined.log` - Full activity log
- `error.log` - Error tracking

## 🔄 Automated Daily Scraping

Run the scheduler to scrape automatically every day at 3:30 AM:

```bash
npm run schedule
```

Press Ctrl+C to stop.

## 📈 Common Tasks

### Get Latest Prices for Toronto
```bash
sqlite3 database/prices.db
sqlite> SELECT * FROM latest_prices WHERE location = 'Toronto, ON' AND rn = 1;
```

### Export Price History for Vancouver
```bash
npm run export history "Vancouver, BC" daily
```

### View All Locations
```bash
sqlite3 database/prices.db
sqlite> SELECT DISTINCT location FROM pricing_records ORDER BY location;
```

### Check Scrape Success Rate
```bash
sqlite3 database/prices.db
sqlite> SELECT status, COUNT(*) FROM scrape_runs GROUP BY status;
```

## ⚙️ Configuration

Edit `.env` to customize:

```env
# Change scrape time (default: 3:30 AM EST)
SCRAPE_SCHEDULE=30 3 * * *

# Change timezone
TIMEZONE=America/Toronto

# See browser in action
HEADLESS=false
```

## 🐛 Troubleshooting

### Scraper fails immediately
```bash
# Reinstall Playwright
npx playwright install chromium --force
```

### Want to see what's happening
```bash
# Edit .env and set:
HEADLESS=false

# Then run:
npm run scrape
```

### Database issues
```bash
# Delete and start fresh
rm database/prices.db
npm run scrape
```

## 📚 Next Steps

- Read [README.md](README.md) for full documentation
- Read [SETUP.md](SETUP.md) for deployment options
- Set up automated scheduling (PM2, cron, or GitHub Actions)

## 🎯 Quick Command Reference

```bash
# Scraping
npm run scrape          # Run once
npm run schedule        # Run daily automatically
npm run dev             # Development mode

# Exporting
npm run export          # All formats
npm run export csv      # CSV only
npm run export excel    # Excel only
npm run export json     # JSON only

# Database queries
sqlite3 database/prices.db "SELECT COUNT(*) FROM pricing_records;"
sqlite3 database/prices.db "SELECT * FROM latest_prices;"

# View logs
cat logs/combined.log
tail -f logs/combined.log  # Follow in real-time
```

## 💡 Tips

1. **First run takes longer** - Playwright downloads browser data
2. **Run in headless mode** for production (HEADLESS=true)
3. **Check logs** if something seems wrong
4. **Backup database** before major changes
5. **Use PM2** for production deployment

## 🎉 You're Ready!

The scraper is now set up and ready to collect daily fuel pricing data automatically.

Need help? Check the logs or open an issue on GitHub.
