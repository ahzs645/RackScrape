-- Petro-Canada Rack Prices Database Schema

-- Pricing records table
CREATE TABLE IF NOT EXISTS pricing_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scrape_id TEXT NOT NULL,
    scrape_timestamp DATETIME NOT NULL,
    effective_date DATE NOT NULL,
    pricing_type TEXT NOT NULL,
    location TEXT NOT NULL,
    reg_87 REAL,
    mid_89 REAL,
    sup_91 REAL,
    reg_e10 REAL,
    mid_e5 REAL,
    uls_diesel REAL,
    ulsd_1 REAL,
    furnace_oil REAL,
    stove REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scrape_id ON pricing_records(scrape_id);
CREATE INDEX IF NOT EXISTS idx_effective_date ON pricing_records(effective_date);
CREATE INDEX IF NOT EXISTS idx_pricing_type ON pricing_records(pricing_type);
CREATE INDEX IF NOT EXISTS idx_location ON pricing_records(location);
CREATE INDEX IF NOT EXISTS idx_scrape_timestamp ON pricing_records(scrape_timestamp);
CREATE INDEX IF NOT EXISTS idx_location_date ON pricing_records(location, effective_date);

-- Scrape runs tracking table
CREATE TABLE IF NOT EXISTS scrape_runs (
    scrape_id TEXT PRIMARY KEY,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
    records_count INTEGER DEFAULT 0,
    error_message TEXT
);

-- Index for scrape runs
CREATE INDEX IF NOT EXISTS idx_scrape_status ON scrape_runs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_started_at ON scrape_runs(started_at);

-- Schedule configuration (single row, id=1)
CREATE TABLE IF NOT EXISTS schedule_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    cron_expression TEXT NOT NULL,
    timezone TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- View for latest prices by location and type
CREATE VIEW IF NOT EXISTS latest_prices AS
SELECT
    pr.*,
    ROW_NUMBER() OVER (
        PARTITION BY pr.location, pr.pricing_type
        ORDER BY pr.effective_date DESC, pr.scrape_timestamp DESC
    ) as rn
FROM pricing_records pr;

-- View for price history by location
CREATE VIEW IF NOT EXISTS price_history AS
SELECT
    location,
    pricing_type,
    effective_date,
    reg_87,
    mid_89,
    sup_91,
    reg_e10,
    mid_e5,
    uls_diesel,
    ulsd_1,
    furnace_oil,
    stove
FROM pricing_records
ORDER BY location, pricing_type, effective_date DESC;
