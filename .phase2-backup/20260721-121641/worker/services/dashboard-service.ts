import { demoDashboard } from '../../src/lib/demo';
import type { DashboardData, PriceSignal, RouteMonitor } from '../../src/types';
import type { Env, MonitorRecord } from '../types';

interface SnapshotRow {
  monitor_id: string;
  min_price: number;
  avg_price: number;
  max_price: number;
  captured_at: string;
}

interface OfferRow {
  monitor_id: string;
  carrier: string;
  price_total: number;
  stops: number;
  duration_minutes: number;
  baggage_included: number;
  captured_at: string;
}

function calculateSignal(current: number, target: number, historicalMin: number): PriceSignal {
  if (current <= target || current <= historicalMin * 1.05) return 'BUY';
  if (current <= target * 1.15) return 'WATCH';
  return 'HIGH';
}

function cloneDemo(provider: string): DashboardData {
  return {
    ...demoDashboard,
    generatedAt: new Date().toISOString(),
    provider: provider === 'amadeus' ? 'Amadeus' : 'Modo demonstração'
  };
}

export async function getDashboardData(env: Env): Promise<DashboardData> {
  try {
    const monitorsResult = await env.DB.prepare(`
      SELECT * FROM monitors WHERE active = 1 ORDER BY created_at ASC
    `).all<MonitorRecord>();

    if (!monitorsResult.results.length) return cloneDemo(env.FLIGHT_PROVIDER);

    const snapshotsResult = await env.DB.prepare(`
      SELECT monitor_id, min_price, avg_price, max_price, captured_at
      FROM price_snapshots ORDER BY captured_at ASC
    `).all<SnapshotRow>();

    if (!snapshotsResult.results.length) return cloneDemo(env.FLIGHT_PROVIDER);

    const latestOffersResult = await env.DB.prepare(`
      SELECT fo.monitor_id, fo.carrier, fo.price_total, fo.stops,
             fo.duration_minutes, fo.baggage_included, fo.captured_at
      FROM flight_offers fo
      INNER JOIN (
        SELECT monitor_id, MAX(captured_at) max_captured
        FROM flight_offers GROUP BY monitor_id
      ) latest ON latest.monitor_id = fo.monitor_id AND latest.max_captured = fo.captured_at
      ORDER BY fo.price_total ASC
    `).all<OfferRow>();

    const routeMonitors: RouteMonitor[] = monitorsResult.results.map((monitor) => {
      const snapshots = snapshotsResult.results.filter((snapshot) => snapshot.monitor_id === monitor.id);
      const current = snapshots.at(-1)?.min_price ?? 0;
      const previous = snapshots.at(-2)?.min_price ?? current;
      const historicalMin = snapshots.length ? Math.min(...snapshots.map((snapshot) => snapshot.min_price)) : current;
      const offer = latestOffersResult.results.find((item) => item.monitor_id === monitor.id);
      const change7d = previous ? ((current - previous) / previous) * 100 : 0;

      return {
        id: monitor.id,
        name: monitor.name,
        origin: monitor.origin,
        destination: monitor.destination,
        outboundDate: monitor.outbound_date,
        returnDate: monitor.return_date,
        adults: monitor.adults,
        children: monitor.children,
        currentPrice: current,
        previousPrice: previous,
        historicalMin,
        targetPrice: monitor.target_price,
        currency: monitor.currency,
        carrier: offer?.carrier ?? 'Aguardando consulta',
        stops: offer?.stops ?? 0,
        durationMinutes: offer?.duration_minutes ?? 0,
        baggageIncluded: offer?.baggage_included === 1,
        signal: calculateSignal(current, monitor.target_price, historicalMin),
        lastCheckedAt: monitor.last_checked_at ?? new Date().toISOString(),
        change7d
      };
    });

    const bestMonitor = [...routeMonitors].sort((a, b) => a.currentPrice - b.currentPrice)[0];
    const bestSnapshots = snapshotsResult.results.filter((snapshot) => snapshot.monitor_id === bestMonitor.id).slice(-30);
    const comparison = latestOffersResult.results
      .filter((offer) => offer.monitor_id === bestMonitor.id)
      .slice(0, 6)
      .map((offer) => ({ carrier: offer.carrier, price: offer.price_total, stops: offer.stops }));

    const alertsResult = await env.DB.prepare(`
      SELECT id, title, description, created_at, severity
      FROM alerts ORDER BY created_at DESC LIMIT 8
    `).all<{ id: string; title: string; description: string; created_at: string; severity: 'good' | 'info' | 'warning' }>();

    const checksResult = await env.DB.prepare(`
      SELECT COUNT(*) total FROM search_runs WHERE started_at >= datetime('now', '-1 day')
    `).first<{ total: number }>();

    const familySavings = routeMonitors.reduce((sum, monitor) => sum + Math.max(0, monitor.previousPrice - monitor.currentPrice), 0);
    const avgChange = routeMonitors.reduce((sum, monitor) => sum + monitor.change7d, 0) / Math.max(1, routeMonitors.length);

    return {
      generatedAt: new Date().toISOString(),
      provider: env.FLIGHT_PROVIDER === 'amadeus' ? 'Amadeus' : 'Modo demonstração',
      summary: {
        activeMonitors: routeMonitors.length,
        bestCurrentPrice: bestMonitor.currentPrice,
        familySavings,
        checksLast24h: checksResult?.total ?? 0,
        averageChange7d: avgChange
      },
      priceHistory: bestSnapshots.map((snapshot) => ({
        date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${snapshot.captured_at}Z`)),
        price: snapshot.min_price,
        average: snapshot.avg_price
      })),
      monitors: routeMonitors,
      airlineComparison: comparison.length ? comparison : demoDashboard.airlineComparison,
      weekdayPrices: demoDashboard.weekdayPrices,
      alerts: alertsResult.results.length
        ? alertsResult.results.map((alert) => ({
            id: alert.id,
            title: alert.title,
            description: alert.description,
            createdAt: alert.created_at,
            severity: alert.severity
          }))
        : demoDashboard.alerts
    };
  } catch (error) {
    console.error('Falha ao montar dashboard', error);
    return cloneDemo(env.FLIGHT_PROVIDER);
  }
}
