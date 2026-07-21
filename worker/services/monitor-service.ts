import { newId } from '../lib/id';
import { getProvider } from '../providers';
import type { Env, FlightOffer, FlightSearchRequest, MonitorRecord } from '../types';

interface AlertResult {
  created: number;
  targetReached: boolean;
  price: number;
  confirmed: boolean;
}

export interface MonitorDateSelection {
  outboundDate: string;
  returnDate: string;
  currentIndex: number;
  nextIndex: number;
  totalCombinations: number;
}

function isoDateRange(start: string, end?: string | null): string[] {
  const effectiveEnd = end && end >= start ? end : start;
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const finalDate = new Date(`${effectiveEnd}T12:00:00Z`);

  while (cursor <= finalDate && dates.length < 31) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates.length ? dates : [start];
}

export function selectMonitorDates(monitor: MonitorRecord): MonitorDateSelection {
  const outboundDates = isoDateRange(monitor.outbound_date, monitor.outbound_end_date);
  const returnDates = isoDateRange(monitor.return_date, monitor.return_end_date);
  const combinations = outboundDates.flatMap((outboundDate) =>
    returnDates
      .filter((returnDate) => returnDate >= outboundDate)
      .map((returnDate) => ({ outboundDate, returnDate }))
  );
  const safeCombinations = combinations.length
    ? combinations
    : [{ outboundDate: monitor.outbound_date, returnDate: monitor.return_date }];
  const currentIndex = Math.max(0, monitor.next_window_index ?? 0) % safeCombinations.length;
  const selected = safeCombinations[currentIndex];

  return {
    ...selected,
    currentIndex,
    nextIndex: (currentIndex + 1) % safeCombinations.length,
    totalCombinations: safeCombinations.length
  };
}

function monitorToRequest(monitor: MonitorRecord, dates: MonitorDateSelection): FlightSearchRequest {
  return {
    origin: monitor.origin,
    destination: monitor.destination,
    outboundDate: dates.outboundDate,
    returnDate: dates.returnDate,
    adults: monitor.adults,
    children: monitor.children,
    currency: monitor.currency,
    directOnly: monitor.direct_only === 1,
    baggageRequired: monitor.baggage_required === 1
  };
}

async function ensureNoActiveRun(env: Env, monitorId: string): Promise<void> {
  await env.DB.prepare(`
    UPDATE search_runs
    SET status = 'ERROR', finished_at = datetime('now'), error_message = 'Execução expirada.'
    WHERE monitor_id = ? AND status = 'RUNNING'
      AND julianday(started_at) < julianday('now', '-20 minutes')
  `).bind(monitorId).run();

  const active = await env.DB.prepare(`
    SELECT id FROM search_runs
    WHERE monitor_id = ? AND status = 'RUNNING'
      AND julianday(started_at) >= julianday('now', '-20 minutes')
    LIMIT 1
  `).bind(monitorId).first<{ id: string }>();

  if (active) throw new Error('Já existe uma consulta em andamento para esta viagem.');
}

async function insertOffers(env: Env, runId: string, monitorId: string, provider: string, offers: FlightOffer[]) {
  const statements = offers.slice(0, 20).map((offer) => env.DB.prepare(`
    INSERT INTO flight_offers (
      id, search_run_id, monitor_id, provider, external_offer_id, carrier,
      flight_numbers, price_total, price_per_person, currency, stops,
      duration_minutes, baggage_included, departure_at, arrival_at,
      booking_url, raw_json, captured_at, price_confirmed, confirmed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
  `).bind(
    newId('offer'),
    runId,
    monitorId,
    provider,
    offer.externalId,
    offer.carrier,
    JSON.stringify(offer.flightNumbers),
    offer.priceTotal,
    offer.pricePerPerson,
    offer.currency,
    offer.stops,
    offer.durationMinutes,
    offer.baggageIncluded ? 1 : 0,
    offer.departureAt ?? null,
    offer.arrivalAt ?? null,
    offer.bookingUrl ?? null,
    JSON.stringify(offer.raw ?? null),
    offer.confirmed ? 1 : 0,
    offer.confirmedAt ?? null
  ));

  if (statements.length > 0) await env.DB.batch(statements);
}

function priceChange(currentPrice: number, previousPrice?: number): number {
  if (!previousPrice || previousPrice <= 0) return 0;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

function deservesConfirmation(monitor: MonitorRecord, price: number, previousPrice?: number): boolean {
  return price <= monitor.target_price || priceChange(price, previousPrice) <= -5;
}

async function logProviderOperation(
  env: Env,
  provider: string,
  operation: 'SEARCH' | 'CONFIRM',
  status: 'SUCCESS' | 'ERROR',
  started: number,
  errorMessage?: string
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO provider_logs (id, provider, operation, status, duration_ms, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    newId('providerlog'),
    provider,
    operation,
    status,
    Math.round(performance.now() - started),
    errorMessage ?? null
  ).run();
}

async function confirmAlertCandidate(
  env: Env,
  provider: ReturnType<typeof getProvider>,
  offer: FlightOffer,
  shouldConfirm: boolean
): Promise<FlightOffer> {
  if (!shouldConfirm || !provider.confirm) return offer;

  const started = performance.now();
  try {
    const confirmed = await provider.confirm(offer);
    await logProviderOperation(env, provider.name, 'CONFIRM', 'SUCCESS', started);
    return confirmed;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida na reconfirmação.';
    await logProviderOperation(env, provider.name, 'CONFIRM', 'ERROR', started, message);
    console.error('Não foi possível reconfirmar a melhor oferta', error);
    return offer;
  }
}

async function canCreateAlert(
  env: Env,
  monitorId: string,
  kind: 'TARGET_REACHED' | 'PRICE_DROP',
  price: number
): Promise<boolean> {
  const recent = await env.DB.prepare(`
    SELECT price FROM alerts
    WHERE monitor_id = ? AND kind = ?
      AND created_at >= datetime('now', '-24 hours')
    ORDER BY created_at DESC LIMIT 1
  `).bind(monitorId, kind).first<{ price: number | null }>();

  if (!recent) return true;
  if (!recent.price || recent.price <= 0) return false;

  // Um novo alerta no mesmo dia só é criado se houver uma queda adicional relevante.
  return ((price - recent.price) / recent.price) * 100 <= -2;
}

async function createAlertsIfNeeded(
  env: Env,
  monitor: MonitorRecord,
  alertOffer: FlightOffer,
  previousPrice?: number
): Promise<AlertResult> {
  // Para providers reais, alerta financeiro só sai após reconfirmação.
  const mayAlert = alertOffer.confirmed || env.FLIGHT_PROVIDER === 'mock';
  if (!mayAlert) {
    return { created: 0, targetReached: false, price: alertOffer.priceTotal, confirmed: false };
  }

  const alerts: D1PreparedStatement[] = [];
  const currentPrice = alertOffer.priceTotal;
  let targetReached = false;

  if (
    currentPrice <= monitor.target_price &&
    await canCreateAlert(env, monitor.id, 'TARGET_REACHED', currentPrice)
  ) {
    targetReached = true;
    alerts.push(env.DB.prepare(`
      INSERT INTO alerts (id, monitor_id, kind, severity, title, description, price)
      VALUES (?, ?, 'TARGET_REACHED', 'good', ?, ?, ?)
    `).bind(
      newId('alert'),
      monitor.id,
      `${monitor.name} atingiu o preço-alvo`,
      `Oferta reconfirmada em ${currentPrice.toFixed(2)} ${monitor.currency}, abaixo da meta de ${monitor.target_price.toFixed(2)}.`,
      currentPrice
    ));
  }

  const change = priceChange(currentPrice, previousPrice);
  if (
    change <= -5 &&
    await canCreateAlert(env, monitor.id, 'PRICE_DROP', currentPrice)
  ) {
    alerts.push(env.DB.prepare(`
      INSERT INTO alerts (id, monitor_id, kind, severity, title, description, price)
      VALUES (?, ?, 'PRICE_DROP', 'info', ?, ?, ?)
    `).bind(
      newId('alert'),
      monitor.id,
      `${monitor.name} caiu ${Math.abs(change).toFixed(1)}%`,
      `O novo preço reconfirmado é ${currentPrice.toFixed(2)} ${monitor.currency}.`,
      currentPrice
    ));
  }

  if (alerts.length) await env.DB.batch(alerts);

  return {
    created: alerts.length,
    targetReached,
    price: currentPrice,
    confirmed: Boolean(alertOffer.confirmed)
  };
}

async function sendWebhook(env: Env, monitor: MonitorRecord, result: AlertResult) {
  if (!env.ALERT_WEBHOOK_URL || !result.targetReached || result.created === 0) return;

  try {
    const response = await fetch(env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: env.APP_NAME,
        monitorId: monitor.id,
        route: `${monitor.origin}-${monitor.destination}`,
        title: `${monitor.name} atingiu a meta`,
        price: result.price,
        targetPrice: monitor.target_price,
        currency: monitor.currency,
        confirmed: result.confirmed
      })
    });

    if (!response.ok) console.error(`Webhook recusado com HTTP ${response.status}.`);
  } catch (error) {
    console.error('Falha ao enviar webhook de alerta', error);
  }
}

export async function executeMonitor(
  env: Env,
  monitorId: string
): Promise<{ offers: number; minPrice: number; confirmed: boolean }> {
  const monitor = await env.DB.prepare('SELECT * FROM monitors WHERE id = ? AND active = 1')
    .bind(monitorId)
    .first<MonitorRecord>();

  if (!monitor) throw new Error('Monitoramento não encontrado ou inativo.');

  await ensureNoActiveRun(env, monitor.id);

  const provider = getProvider(env);
  const dates = selectMonitorDates(monitor);
  const runId = newId('run');
  const startedAt = new Date().toISOString();
  const started = performance.now();

  await env.DB.prepare(`
    INSERT INTO search_runs (
      id, monitor_id, provider, status, started_at, query_outbound_date, query_return_date
    ) VALUES (?, ?, ?, 'RUNNING', ?, ?, ?)
  `).bind(
    runId,
    monitor.id,
    provider.name,
    startedAt,
    dates.outboundDate,
    dates.returnDate
  ).run();

  try {
    const previousSnapshot = await env.DB.prepare(`
      SELECT min_price FROM price_snapshots
      WHERE monitor_id = ? ORDER BY captured_at DESC LIMIT 1
    `).bind(monitor.id).first<{ min_price: number }>();

    const offers = (await provider.search(monitorToRequest(monitor, dates)))
      .sort((a, b) => a.priceTotal - b.priceTotal);

    if (!offers.length) throw new Error('Nenhuma oferta encontrada para os filtros informados.');

    const searchBest = offers[0];
    const alertOffer = await confirmAlertCandidate(
      env,
      provider,
      searchBest,
      deservesConfirmation(monitor, searchBest.priceTotal, previousSnapshot?.min_price)
    );

    // Substitui a oferta original pela versão confirmada, preservando o restante do comparativo.
    offers[0] = alertOffer;
    offers.sort((a, b) => a.priceTotal - b.priceTotal);

    const prices = offers.map((offer) => offer.priceTotal);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    await insertOffers(env, runId, monitor.id, provider.name, offers);
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO price_snapshots (
          id, monitor_id, search_run_id, min_price, avg_price, max_price,
          currency, best_offer_id, captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        newId('snapshot'), monitor.id, runId, minPrice, avgPrice, maxPrice,
        offers[0].currency, offers[0].externalId
      ),
      env.DB.prepare(`
        UPDATE search_runs SET status = 'SUCCESS', finished_at = datetime('now'), offers_found = ?
        WHERE id = ?
      `).bind(offers.length, runId),
      env.DB.prepare(`
        UPDATE monitors
        SET last_checked_at = datetime('now'), last_success_at = datetime('now'),
            last_error = NULL, next_window_index = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(dates.nextIndex, monitor.id)
    ]);

    await logProviderOperation(env, provider.name, 'SEARCH', 'SUCCESS', started);
    const alerts = await createAlertsIfNeeded(env, monitor, alertOffer, previousSnapshot?.min_price);
    await sendWebhook(env, monitor, alerts);

    return { offers: offers.length, minPrice, confirmed: Boolean(alertOffer.confirmed) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE search_runs SET status = 'ERROR', finished_at = datetime('now'), error_message = ?
        WHERE id = ?
      `).bind(message, runId),
      env.DB.prepare(`
        UPDATE monitors
        SET last_checked_at = datetime('now'), last_error = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(message, monitor.id)
    ]);
    await logProviderOperation(env, provider.name, 'SEARCH', 'ERROR', started, message);
    throw error;
  }
}

export async function runActiveMonitors(env: Env): Promise<void> {
  const result = await env.DB.prepare(`
    SELECT * FROM monitors
    WHERE active = 1
    ORDER BY COALESCE(last_checked_at, '1970-01-01') ASC
    LIMIT 25
  `).all<MonitorRecord>();

  const concurrency = 3;
  for (let index = 0; index < result.results.length; index += concurrency) {
    const batch = result.results.slice(index, index + concurrency);
    await Promise.all(batch.map(async (monitor) => {
      try {
        await executeMonitor(env, monitor.id);
      } catch (error) {
        console.error(`Falha no monitor ${monitor.id}`, error);
      }
    }));
  }
}
