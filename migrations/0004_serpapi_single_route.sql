PRAGMA foreign_keys = ON;

ALTER TABLE monitors ADD COLUMN outbound_end_date TEXT;
ALTER TABLE monitors ADD COLUMN return_end_date TEXT;
ALTER TABLE monitors ADD COLUMN next_window_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_runs ADD COLUMN query_outbound_date TEXT;
ALTER TABLE search_runs ADD COLUMN query_return_date TEXT;

UPDATE monitors SET active = 0;

UPDATE monitors
SET name = 'Réveillon Recife 2026/2027',
    origin = 'CNF',
    destination = 'REC',
    outbound_date = '2026-12-26',
    outbound_end_date = '2026-12-29',
    return_date = '2027-01-04',
    return_end_date = '2027-01-06',
    next_window_index = 0,
    active = 1,
    last_checked_at = NULL,
    last_success_at = NULL,
    last_error = NULL,
    updated_at = datetime('now')
WHERE id = (
  SELECT id
  FROM monitors
  WHERE origin = 'CNF' AND destination = 'REC'
  ORDER BY CASE WHEN name LIKE '%Réveillon%' THEN 0 ELSE 1 END, created_at DESC
  LIMIT 1
);

INSERT INTO monitors (
  id, family_id, name, origin, destination, outbound_date, outbound_end_date,
  return_date, return_end_date, adults, children, target_price, direct_only,
  baggage_required, currency, active, next_window_index
)
SELECT
  'recife-reveillon-2026', 'family-safadi', 'Réveillon Recife 2026/2027',
  'CNF', 'REC', '2026-12-26', '2026-12-29', '2027-01-04', '2027-01-06',
  2, 0, 5000, 0, 0, 'BRL', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM monitors WHERE active = 1);

DELETE FROM alerts;
DELETE FROM price_snapshots;
DELETE FROM flight_offers;
DELETE FROM search_runs;
DELETE FROM provider_logs;
DELETE FROM monitors WHERE active = 0;
