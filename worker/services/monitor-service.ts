import { newId } from '../lib/id';
import { getProvider } from '../providers';
import type { Env, FlightOffer, MonitorRecord } from '../types';

function monitorToRequest(monitor: MonitorRecord) {
  return {
    origin: monitor.origin,
    destination: monitor.destination,
    outboundDate: monitor.outbound_date,
    returnDate: monitor.return_date,
    adults: monitor.adults,
    children: monitor.children,
    currency: monitor.currency,
    directOnly: monitor.direct_only === 1,
    baggageRequired: monitor.baggage_required === 1
  };
}

async function insertOffers(env: Env, runId: string, monitorId: string, provider: string, offers: FlightOffer[]) {
  const statements = offers.slice(0, 20).map((offer) => env.DB.prepare(`
    INSERT INTO flight_offers (
      id, search_run_id, monitor_id, provider, external_offer_id, carrier,
      flight_numbers, price_total, price_per_person, currency, stops,
      duration_minutes, baggage_included, departure_at, arrival_at,
      booking_url, raw_json, captured_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
    JSON.stringify(offer.raw ?? null)
  ));

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
}

async function createAlertIfNeeded(env: Env, monitor: MonitorRecord, currentPrice: number, previousPrice?: number) {
  const alerts: D1PreparedStatement[] = [];

  if (currentPrice <= monitor.target_price) {
    alerts.push(env.DB.prepare(`
      INSERT INTO alerts (id, monitor_id, kind, severity, title, description, price)
      VALUES (?, ?, 'TARGET_REACHED', 'good', ?, ?, ?)
    `).bind(
      newId('alert'),
      monitor.id,
      `${monitor.name} atingiu o preço-alvo`,
      `O total caiu para ${currentPrice.toFixed(2)} ${monitor.currency}, abaixo da meta de ${monitor.target_price.toFixed(2)}.`,
      currentPrice
    ));
  }

  if (previousPrice && previousPrice > 0) {
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    if (change <= -5) {
      alerts.push(env.DB.prepare(`
        INSERT INTO alerts (id, monitor_id, kind, severity, title, description, price)
        VALUES (?, ?, 'PRICE_DROP', 'info', ?, ?, ?)
      `).bind(
        newId('alert'),
        monitor.id,
        `${monitor.name} caiu ${Math.abs(change).toFixed(1)}%`,
        `O novo menor preço é ${currentPrice.toFixed(2)} ${monitor.currency}.`,
        currentPrice
      ));
    }
  }

  if (alerts.length) {
    await env.DB.batch(alerts);
  }
}

async function sendWebhook(env: Env, monitor: MonitorRecord, price: number) {
  if (!env.ALERT_WEBHOOK_URL || price > monitor.target_price) return;

  await fetch(env.ALERT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app: env.APP_NAME,
      monitorId: monitor.id,
      route: `${monitor.origin}-${monitor.destination}`,
      title: `${monitor.name} atingiu a meta`,
      price,
      targetPrice: monitor.target_price,
      currency: monitor.currency
    })
  });
}

export async function executeMonitor(env: Env, monitorId: string): Promise<{ offers: number; minPrice: number }> {
  const monitor = await env.DB.prepare('SELECT * FROM monitors WHERE id = ? AND active = 1')
    .bind(monitorId)
    .first<MonitorRecord>();

  if (!monitor) throw new Error('Monitoramento não encontrado ou inativo.');

  const provider = getProvider(env);
  const runId = newId('run');
  const startedAt = new Date().toISOString();
  const started = performance.now();

  await env.DB.prepare(`
    INSERT INTO search_runs (id, monitor_id, provider, status, started_at)
    VALUES (?, ?, ?, 'RUNNING', ?)
  `).bind(runId, monitor.id, provider.name, startedAt).run();

  try {
    const previousSnapshot = await env.DB.prepare(`
      SELECT min_price FROM price_snapshots
      WHERE monitor_id = ? ORDER BY captured_at DESC LIMIT 1
    `).bind(monitor.id).first<{ min_price: number }>();

    const offers = (await provider.search(monitorToRequest(monitor)))
      .sort((a, b) => a.priceTotal - b.priceTotal);

    if (!offers.length) throw new Error('Nenhuma oferta encontrada para os filtros informados.');

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
        UPDATE monitors SET last_checked_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(monitor.id),
      env.DB.prepare(`
        INSERT INTO provider_logs (id, provider, operation, status, duration_ms, created_at)
        VALUES (?, ?, 'SEARCH', 'SUCCESS', ?, datetime('now'))
      `).bind(newId('providerlog'), provider.name, Math.round(performance.now() - started))
    ]);

    await createAlertIfNeeded(env, monitor, minPrice, previousSnapshot?.min_price);
    await sendWebhook(env, monitor, minPrice);

    return { offers: offers.length, minPrice };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE search_runs SET status = 'ERROR', finished_at = datetime('now'), error_message = ?
        WHERE id = ?
      `).bind(message, runId),
      env.DB.prepare(`
        INSERT INTO provider_logs (id, provider, operation, status, duration_ms, error_message, created_at)
        VALUES (?, ?, 'SEARCH', 'ERROR', ?, ?, datetime('now'))
      `).bind(newId('providerlog'), provider.name, Math.round(performance.now() - started), message)
    ]);
    throw error;
  }
}

export async function runActiveMonitors(env: Env): Promise<void> {
  const result = await env.DB.prepare(`
    SELECT * FROM monitors WHERE active = 1 ORDER BY COALESCE(last_checked_at, '1970-01-01') ASC LIMIT 25
  `).all<MonitorRecord>();

  for (const monitor of result.results) {
    try {
      await executeMonitor(env, monitor.id);
    } catch (error) {
      console.error(`Falha no monitor ${monitor.id}`, error);
    }
  }
}
