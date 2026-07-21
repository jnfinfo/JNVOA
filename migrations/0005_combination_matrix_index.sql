CREATE INDEX IF NOT EXISTS idx_runs_monitor_query_dates_started
  ON search_runs(monitor_id, query_outbound_date, query_return_date, started_at DESC);
