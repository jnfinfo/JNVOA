import type { DashboardData, PriceSignal, RouteMonitor } from '../../src/types';
import { getSerpApiQuota } from '../providers/serpapi';
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
  provider: string;
  carrier: string;
  price_total: number;
  stops: number;
  duration_minutes: number;
  baggage_included: number;
  price_confirmed: number;
  confirmed_at: string | null;
  booking_url: string | null;
  captured_at: string;
  query_outbound_date: string | null;
  query_return_date: string | null;
}

function calculateSignal(current: number, target: number, historicalMin: number): PriceSignal {
  if (!current) return 'WATCH';
  if (current <= target || (historicalMin > 0 && current <= historicalMin * 1.05)) return 'BUY';
  if (current <= target * 1.15) return 'WATCH';
  return 'HIGH';
}

function providerLabel(env: Env): string {
  if (env.FLIGHT_PROVIDER === 'serpapi') return 'Google Flights • SerpApi';
  if (env.FLIGHT_PROVIDER === 'amadeus') {
    return env.AMADEUS_ENV === 'production' ? 'Amadeus • produção' : 'Amadeus • teste';
  }
  return 'Modo demonstração';
}

function providerEnvironment(env: Env): string {
  if (env.FLIGHT_PROVIDER === 'serpapi') return 'Google Flights';
  if (env.FLIGHT_PROVIDER === 'amadeus') return env.AMADEUS_ENV ?? 'test';
  return 'simulado';
}

function emptyDashboard(env: Env): DashboardData {
  return {
    generatedAt: new Date().toISOString(),
    provider: providerLabel(env),
    providerEnvironment: providerEnvironment(env),
    summary: {
      activeMonitors: 0,
      bestCurrentPrice: 0,
      familySavings: 0,
      checksLast24h: 0,
      averageChange7d: 0
    },
    priceHistory: [],
    monitors: [],
    airlineComparison: [],
    weekdayPrices: [],
    alerts: []
  };
}

export async function getDashboardData(env: Env): Promise<DashboardData> {
  try {
    const [monitorsResult, snapshotsResult, latestOffersResult, alertsResult, checksResult, quota] = await Promise.all([
      env.DB.prepare(`
        SELECT * FROM monitors WHERE active = 1 ORDER BY created_at ASC
      `).all<MonitorRecord>(),
      env.DB.prepare(`
        SELECT monitor_id, min_price, avg_price, max_price, captured_at
        FROM price_snapshots ORDER BY captured_at ASC
      `).all<SnapshotRow>(),
      env.DB.prepare(`
        SELECT fo.monitor_id, fo.provider, fo.carrier, fo.price_total, fo.stops,
               fo.duration_minutes, fo.baggage_included, fo.price_confirmed,
               fo.confirmed_at, fo.booking_url, fo.captured_at,
               sr.query_outbound_date, sr.query_return_date
        FROM flight_offers fo
        INNER JOIN search_runs sr ON sr.id = fo.search_run_id
        INNER JOIN (
          SELECT monitor_id, MAX(captured_at) max_captured
          FROM flight_offers GROUP BY monitor_id
        ) latest ON latest.monitor_id = fo.monitor_id AND latest.max_captured = fo.captured_at
        ORDER BY fo.price_total ASC
      `).all<OfferRow>(),
      env.DB.prepare(`
        SELECT id, title, description, created_at, severity
        FROM alerts ORDER BY created_at DESC LIMIT 8
      `).all<{ id: string; title: string; description: string; created_at: string; severity: 'good' | 'info' | 'warning' }>(),
      env.DB.prepare(`
        SELECT COUNT(*) total FROM search_runs WHERE started_at >= datetime('now', '-1 day')
      `).first<{ total: number }>(),
      env.FLIGHT_PROVIDER === 'serpapi' ? getSerpApiQuota(env) : Promise.resolve(undefined)
    ]);

    if (!monitorsResult.results.length) {
      return { ...emptyDashboard(env), quota };
    }

    const routeMonitors: RouteMonitor[] = monitorsResult.results.map((monitor) => {
      const snapshots = snapshotsResult.results.filter((snapshot) => snapshot.monitor_id === monitor.id);
      const offer = latestOffersResult.results.find((item) => item.monitor_id === monitor.id);
      const current = snapshots[snapshots.length - 1]?.min_price ?? offer?.price_total ?? 0;
      const previous = snapshots[snapshots.length - 2]?.min_price ?? current;
      const historicalMin = snapshots.length
        ? Math.min(...snapshots.map((snapshot) => snapshot.min_price))
        : current;
      const change7d = previous ? ((current - previous) / previous) * 100 : 0;

      return {
        id: monitor.id,
        name: monitor.name,
        origin: monitor.origin,
        destination: monitor.destination,
        outboundDate: monitor.outbound_date,
        outboundEndDate: monitor.outbound_end_date ?? monitor.outbound_date,
        returnDate: monitor.return_date,
        returnEndDate: monitor.return_end_date ?? monitor.return_date,
        lastQueryOutboundDate: offer?.query_outbound_date ?? undefined,
        lastQueryReturnDate: offer?.query_return_date ?? undefined,
        adults: monitor.adults,
        children: monitor.children,
        currentPrice: current,
        previousPrice: previous,
        historicalMin,
        targetPrice: monitor.target_price,
        currency: monitor.currency,
        carrier: offer?.carrier ?? 'Aguardando primeira consulta',
        provider: offer?.provider ?? env.FLIGHT_PROVIDER,
        stops: offer?.stops ?? 0,
        durationMinutes: offer?.duration_minutes ?? 0,
        baggageIncluded: offer?.baggage_included === 1,
        priceConfirmed: offer?.price_confirmed === 1,
        confirmedAt: offer?.confirmed_at ?? undefined,
        bookingUrl: offer?.booking_url ?? undefined,
        lastError: monitor.last_error ?? undefined,
        signal: calculateSignal(current, monitor.target_price, historicalMin),
        lastCheckedAt: monitor.last_checked_at ?? new Date().toISOString(),
        change7d
      };
    });

    const bestMonitor = [...routeMonitors]
      .sort((a, b) => (a.currentPrice || Number.MAX_SAFE_INTEGER) - (b.currentPrice || Number.MAX_SAFE_INTEGER))[0];
    const bestSnapshots = snapshotsResult.results
      .filter((snapshot) => snapshot.monitor_id === bestMonitor.id)
      .slice(-30);
    const comparison = latestOffersResult.results
      .filter((offer) => offer.monitor_id === bestMonitor.id)
      .slice(0, 6)
      .map((offer) => ({ carrier: offer.carrier, price: offer.price_total, stops: offer.stops }));

    const familySavings = routeMonitors.reduce(
      (sum, monitor) => sum + Math.max(0, monitor.previousPrice - monitor.currentPrice),
      0
    );
    const avgChange = routeMonitors.reduce((sum, monitor) => sum + monitor.change7d, 0)
      / Math.max(1, routeMonitors.length);

    return {
      generatedAt: new Date().toISOString(),
      provider: providerLabel(env),
      providerEnvironment: providerEnvironment(env),
      quota,
      summary: {
        activeMonitors: routeMonitors.length,
        bestCurrentPrice: bestMonitor.currentPrice,
        familySavings,
        checksLast24h: checksResult?.total ?? 0,
        averageChange7d: avgChange
      },
      priceHistory: bestSnapshots.map((snapshot) => ({
        date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
          .format(new Date(`${snapshot.captured_at}Z`)),
        price: snapshot.min_price,
        average: snapshot.avg_price
      })),
      monitors: routeMonitors,
      airlineComparison: comparison,
      weekdayPrices: [],
      alerts: alertsResult.results.map((alert) => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        createdAt: alert.created_at,
        severity: alert.severity
      }))
    };
  } catch (error) {
    console.error('Falha ao montar dashboard', error);
    return emptyDashboard(env);
  }
}
