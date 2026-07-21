PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS monitors (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  outbound_date TEXT NOT NULL,
  return_date TEXT NOT NULL,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  target_price REAL NOT NULL,
  direct_only INTEGER NOT NULL DEFAULT 0,
  baggage_required INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  active INTEGER NOT NULL DEFAULT 1,
  last_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE IF NOT EXISTS search_runs (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  offers_found INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flight_offers (
  id TEXT PRIMARY KEY,
  search_run_id TEXT NOT NULL,
  monitor_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_offer_id TEXT,
  carrier TEXT NOT NULL,
  flight_numbers TEXT,
  price_total REAL NOT NULL,
  price_per_person REAL NOT NULL,
  currency TEXT NOT NULL,
  stops INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  baggage_included INTEGER NOT NULL DEFAULT 0,
  departure_at TEXT,
  arrival_at TEXT,
  booking_url TEXT,
  raw_json TEXT,
  captured_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (search_run_id) REFERENCES search_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS price_snapshots (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  search_run_id TEXT NOT NULL,
  min_price REAL NOT NULL,
  avg_price REAL NOT NULL,
  max_price REAL NOT NULL,
  currency TEXT NOT NULL,
  best_offer_id TEXT,
  captured_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
  FOREIGN KEY (search_run_id) REFERENCES search_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_monitors_active ON monitors(active, last_checked_at);
CREATE INDEX IF NOT EXISTS idx_runs_monitor_started ON search_runs(monitor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_monitor_captured ON flight_offers(monitor_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_monitor_captured ON price_snapshots(monitor_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_monitor_created ON alerts(monitor_id, created_at DESC);
