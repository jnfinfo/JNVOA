INSERT OR IGNORE INTO families (id, name) VALUES ('family-safadi', 'Família Safadi');

INSERT OR IGNORE INTO monitors (
  id, family_id, name, origin, destination, outbound_date, return_date,
  adults, children, target_price, direct_only, baggage_required, currency, active,
  last_checked_at
) VALUES
('orlando', 'family-safadi', 'Férias em Orlando', 'CNF', 'MCO', '2026-12-12', '2026-12-27', 2, 2, 11000, 0, 1, 'BRL', 1, datetime('now', '-18 minutes')),
('recife', 'family-safadi', 'Janeiro em Recife', 'CNF', 'REC', '2027-01-08', '2027-01-15', 4, 1, 4200, 1, 0, 'BRL', 1, datetime('now', '-42 minutes')),
('lisboa', 'family-safadi', 'Lisboa em família', 'GRU', 'LIS', '2027-04-03', '2027-04-17', 3, 0, 13000, 1, 1, 'BRL', 1, datetime('now', '-65 minutes'));
