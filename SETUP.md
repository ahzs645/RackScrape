# Quick Setup Guide

## Step-by-Step Installation

### 1. Install Node.js

Make sure you have Node.js 16+ installed:
```bash
node --version  # Should show v16.0.0 or higher
```

If not installed, download from: https://nodejs.org/

### 2. Install Dependencies

```bash
npm install
```

This installs:
- Crawlee (web scraping framework)
- Playwright (browser automation)
- SQLite (database)
- ExcelJS (Excel exports)
- Winston (logging)
- And other dependencies

### 3. Install Playwright Browsers

```bash
npx playwright install chromium
```

This downloads the Chromium browser that Playwright uses for scraping.

### 4. Verify Installation

Run a test scrape:
```bash
npm run scrape
```

You should see:
- Browser activity (if HEADLESS=false)
- Console output showing progress
- Data saved to `database/prices.db`
- Exports in `storage/datasets/`
- Logs in `logs/`

### 5. Check the Results

**View Database:**
```bash
sqlite3 database/prices.db
sqlite> SELECT COUNT(*) FROM pricing_records;
sqlite> SELECT * FROM latest_prices LIMIT 5;
sqlite> .quit
```

**View Exports:**
```bash
ls storage/datasets/
ls exports/
```

**View Logs:**
```bash
cat logs/combined.log
```

## First Run

After installation, try these commands in order:

### 1. Single Scrape Test
```bash
npm run scrape
```
Expected output: "Scraper Completed Successfully"

### 2. Export Data Test
```bash
npm run export
```
Check `exports/` directory for CSV, JSON, and Excel files.

### 3. Schedule Test (Optional)
```bash
# Edit .env to set RUN_ON_STARTUP=true for immediate test
npm run schedule
```
Press Ctrl+C to stop after the scrape completes.

## Common Issues

### Issue: "playwright not installed"
```bash
npx playwright install chromium
```

### Issue: "Permission denied"
```bash
chmod +x node_modules/.bin/*
```

### Issue: Database locked
Stop all running instances:
```bash
pkill -f "tsx src"
```

### Issue: Port already in use
Only one scheduler should run at a time. Check:
```bash
ps aux | grep "tsx src/scheduler"
kill <PID>
```

## Configuration

### Customize Scrape Schedule

Edit `.env`:
```env
# Run every day at 3:30 AM EST
SCRAPE_SCHEDULE=30 3 * * *

# Run every 6 hours
SCRAPE_SCHEDULE=0 */6 * * *

# Run twice daily (9 AM and 9 PM)
SCRAPE_SCHEDULE=0 9,21 * * *
```

Cron format: `minute hour day-of-month month day-of-week`

### Change Timezone

Edit `.env`:
```env
TIMEZONE=America/Toronto
TIMEZONE=America/Vancouver
TIMEZONE=America/Edmonton
```

### Debug Mode

To see the browser in action:
```env
HEADLESS=false
```

## Directory Structure After First Run

```
RackScrape/
├── database/
│   └── prices.db              # SQLite database with all data
├── storage/
│   └── datasets/
│       └── default/           # Crawlee auto-exports (JSON)
├── exports/
│   ├── rack-prices-*.csv      # CSV exports
│   ├── rack-prices-*.json     # JSON exports
│   └── rack-prices-*.xlsx     # Excel exports
├── logs/
│   ├── combined.log           # All logs
│   └── error.log              # Error logs only
└── ...
```

## Production Deployment

### Using PM2 (Process Manager)

1. Install PM2:
```bash
npm install -g pm2
```

2. Start scheduler:
```bash
pm2 start npm --name "rackscrape-scheduler" -- run schedule
```

3. Save configuration:
```bash
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

4. Monitor:
```bash
pm2 status
pm2 logs rackscrape-scheduler
pm2 restart rackscrape-scheduler
```

### Using Systemd (Linux)

Create `/etc/systemd/system/rackscrape.service`:

```ini
[Unit]
Description=RackScrape Scheduler
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/RackScrape
ExecStart=/usr/bin/npm run schedule
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable rackscrape
sudo systemctl start rackscrape
sudo systemctl status rackscrape
```

### Using Cron (Alternative)

Add to crontab:
```bash
crontab -e

# Add this line:
30 3 * * * cd /path/to/RackScrape && /usr/bin/npm run scrape >> logs/cron.log 2>&1
```

## Next Steps

1. **Set up automated scheduling** (PM2, systemd, or cron)
2. **Configure exports** for your needs
3. **Set up backups** of the database
4. **Monitor logs** regularly
5. **Export data** periodically for analysis

## Getting Help

- Check logs: `cat logs/error.log`
- Run in debug mode: `HEADLESS=false npm run scrape`
- Open an issue on GitHub

## Useful Commands

```bash
# Development
npm run dev              # Watch mode with auto-reload

# Production
npm run scrape           # Run once
npm run schedule         # Run scheduler
npm run export           # Export all formats

# Specific exports
npm run export csv
npm run export excel
npm run export history "Toronto, ON" daily

# Database queries
sqlite3 database/prices.db "SELECT * FROM latest_prices;"

# Clear old data (careful!)
rm -rf storage/datasets/*
rm -rf exports/*
```

## Maintenance

### Database Backup

```bash
# Create backup
sqlite3 database/prices.db ".backup database/prices-backup-$(date +%Y%m%d).db"

# Automated daily backup
# Add to cron:
0 4 * * * sqlite3 /path/to/database/prices.db ".backup /path/to/backups/prices-$(date +\%Y\%m\%d).db"
```

### Log Rotation

Logs can grow large. Set up log rotation:

```bash
# Install logrotate
sudo apt-get install logrotate

# Create /etc/logrotate.d/rackscrape
/path/to/RackScrape/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0644 youruser youruser
}
```

### Cleanup Old Data

```bash
# Delete records older than 1 year
sqlite3 database/prices.db "DELETE FROM pricing_records WHERE scrape_timestamp < datetime('now', '-1 year');"

# Vacuum to reclaim space
sqlite3 database/prices.db "VACUUM;"
```

Happy scraping! 🚀
