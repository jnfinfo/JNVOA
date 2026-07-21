ALTER TABLE flight_offers ADD COLUMN price_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE flight_offers ADD COLUMN confirmed_at TEXT;
ALTER TABLE monitors ADD COLUMN last_success_at TEXT;
ALTER TABLE monitors ADD COLUMN last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_runs_monitor_status_started
  ON search_runs(monitor_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_monitor_confirmed
  ON flight_offers(monitor_id, price_confirmed, captured_at DESC);
