import type {
  DashboardData,
  DateCombination,
  PriceSignal,
  RouteMonitor
} from '../../src/types';
import { buildMonitorDatePairs, combinationKey } from '../lib/date-combinations';
import { getSerpApiQuota } from '../providers/serpapi';
import type { Env, MonitorRecord } from '../types';

interface SnapshotRow {
  search_run_id: string;
  monitor_id: string;
  min_price: number;
  avg_price: number;
  max_price: number;
  captured_at: string;
  query_outbound_date: string | null;
  query_return_date: string | null;
}

interface OfferRow {
  search_run_id: string;
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

function priceChange(current: number, previous?: number): number {
  if (!previous || previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
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
      averageChange7d: 0,
      combinationsQueried: 0,
      combinationsTotal: 0
    },
    priceHistory: [],
    monitors: [],
    dateCombinations: [],
    airlineComparison: [],
    weekdayPrices: [],
    alerts: []
  };
}

function buildCombinationData(
  monitor: MonitorRecord,
  snapshots: SnapshotRow[],
  offers: OfferRow[]
): DateCombination[] {
  const pairs = buildMonitorDatePairs(monitor);
  const nextIndex = Math.max(0, monitor.next_window_index ?? 0) % pairs.length;
  const nextKey = combinationKey(pairs[nextIndex]);

  const combinations = pairs.map<DateCombination>((pair) => {
    const pairSnapshots = snapshots.filter((snapshot) =>
      snapshot.monitor_id === monitor.id
      && snapshot.query_outbound_date === pair.outboundDate
      && snapshot.query_return_date === pair.returnDate
    );
    const latest = pairSnapshots[pairSnapshots.length - 1];
    const previous = pairSnapshots[pairSnapshots.length - 2];
    const latestOffers = latest
      ? offers
          .filter((offer) => offer.search_run_id === latest.search_run_id)
          .sort((a, b) => a.price_total - b.price_total)
      : [];
    const bestOffer = latestOffers[0];
    const historicalMin = pairSnapshots.length
      ? Math.min(...pairSnapshots.map((snapshot) => snapshot.min_price))
      : 0;

    return {
      key: combinationKey(pair),
      outboundDate: pair.outboundDate,
      returnDate: pair.returnDate,
      latestPrice: latest?.min_price ?? 0,
      previousPrice: previous?.min_price ?? 0,
      historicalMin,
      averagePrice: latest?.avg_price ?? 0,
      changePct: latest ? priceChange(latest.min_price, previous?.min_price) : 0,
      carrier: bestOffer?.carrier,
      stops: bestOffer?.stops,
      durationMinutes: bestOffer?.duration_minutes,
      baggageIncluded: bestOffer ? bestOffer.baggage_included === 1 : undefined,
      bookingUrl: bestOffer?.booking_url ?? undefined,
      lastCheckedAt: latest?.captured_at,
      queryCount: pairSnapshots.length,
      isNext: combinationKey(pair) === nextKey,
      isBest: false
    };
  });

  const best = combinations
    .filter((combination) => combination.latestPrice > 0)
    .sort((a, b) => a.latestPrice - b.latestPrice)[0];

  if (best) best.isBest = true;
  return combinations;
}

export async function getDashboardData(env: Env): Promise<DashboardData> {
  try {
    const [monitorsResult, snapshotsResult, offersResult, alertsResult, checksResult, quota] = await Promise.all([
      env.DB.prepare(`
        SELECT * FROM monitors WHERE active = 1 ORDER BY created_at ASC
      `).all<MonitorRecord>(),
      env.DB.prepare(`
        SELECT ps.search_run_id, ps.monitor_id, ps.min_price, ps.avg_price,
               ps.max_price, ps.captured_at, sr.query_outbound_date, sr.query_return_date
        FROM price_snapshots ps
        INNER JOIN search_runs sr ON sr.id = ps.search_run_id
        WHERE sr.status = 'SUCCESS'
        ORDER BY ps.captured_at ASC
      `).all<SnapshotRow>(),
      env.DB.prepare(`
        SELECT fo.search_run_id, fo.monitor_id, fo.provider, fo.carrier,
               fo.price_total, fo.stops, fo.duration_minutes, fo.baggage_included,
               fo.price_confirmed, fo.confirmed_at, fo.booking_url, fo.captured_at,
               sr.query_outbound_date, sr.query_return_date
        FROM flight_offers fo
        INNER JOIN search_runs sr ON sr.id = fo.search_run_id
        WHERE sr.status = 'SUCCESS'
        ORDER BY fo.captured_at ASC, fo.price_total ASC
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

    const monitorCombinations = new Map<string, DateCombination[]>();
    for (const monitor of monitorsResult.results) {
      monitorCombinations.set(
        monitor.id,
        buildCombinationData(monitor, snapshotsResult.results, offersResult.results)
      );
    }

    const routeMonitors: RouteMonitor[] = monitorsResult.results.map((monitor) => {
      const combinations = monitorCombinations.get(monitor.id) ?? [];
      const bestCombination = combinations.find((combination) => combination.isBest);
      const latestSnapshot = snapshotsResult.results
        .filter((snapshot) => snapshot.monitor_id === monitor.id)
        .at(-1);
      const latestOffer = latestSnapshot
        ? offersResult.results.find((offer) => offer.search_run_id === latestSnapshot.search_run_id)
        : undefined;
      const bestLatestSnapshot = bestCombination
        ? snapshotsResult.results
            .filter((snapshot) =>
              snapshot.monitor_id === monitor.id
              && snapshot.query_outbound_date === bestCombination.outboundDate
              && snapshot.query_return_date === bestCombination.returnDate
            )
            .at(-1)
        : undefined;
      const bestOffer = bestLatestSnapshot
        ? offersResult.results
            .filter((offer) => offer.search_run_id === bestLatestSnapshot.search_run_id)
            .sort((a, b) => a.price_total - b.price_total)[0]
        : undefined;
      const current = bestCombination?.latestPrice ?? 0;
      const previous = bestCombination?.previousPrice || current;
      const historicalMin = bestCombination?.historicalMin ?? current;

      return {
        id: monitor.id,
        name: monitor.name,
        origin: monitor.origin,
        destination: monitor.destination,
        outboundDate: monitor.outbound_date,
        outboundEndDate: monitor.outbound_end_date ?? monitor.outbound_date,
        returnDate: monitor.return_date,
        returnEndDate: monitor.return_end_date ?? monitor.return_date,
        lastQueryOutboundDate: latestSnapshot?.query_outbound_date ?? undefined,
        lastQueryReturnDate: latestSnapshot?.query_return_date ?? undefined,
        bestOutboundDate: bestCombination?.outboundDate,
        bestReturnDate: bestCombination?.returnDate,
        combinationsQueried: combinations.filter((combination) => combination.queryCount > 0).length,
        combinationsTotal: combinations.length,
        adults: monitor.adults,
        children: monitor.children,
        currentPrice: current,
        previousPrice: previous,
        historicalMin,
        targetPrice: monitor.target_price,
        currency: monitor.currency,
        carrier: bestOffer?.carrier ?? latestOffer?.carrier ?? 'Aguardando primeira consulta',
        provider: bestOffer?.provider ?? latestOffer?.provider ?? env.FLIGHT_PROVIDER,
        stops: bestOffer?.stops ?? latestOffer?.stops ?? 0,
        durationMinutes: bestOffer?.duration_minutes ?? latestOffer?.duration_minutes ?? 0,
        baggageIncluded: (bestOffer?.baggage_included ?? latestOffer?.baggage_included) === 1,
        priceConfirmed: (bestOffer?.price_confirmed ?? latestOffer?.price_confirmed) === 1,
        confirmedAt: bestOffer?.confirmed_at ?? latestOffer?.confirmed_at ?? undefined,
        bookingUrl: bestOffer?.booking_url ?? latestOffer?.booking_url ?? undefined,
        lastError: monitor.last_error ?? undefined,
        signal: calculateSignal(current, monitor.target_price, historicalMin),
        lastCheckedAt: monitor.last_checked_at ?? new Date().toISOString(),
        change7d: bestCombination?.changePct ?? 0
      };
    });

    const bestMonitor = [...routeMonitors]
      .sort((a, b) => (a.currentPrice || Number.MAX_SAFE_INTEGER) - (b.currentPrice || Number.MAX_SAFE_INTEGER))[0];
    const bestCombinations = monitorCombinations.get(bestMonitor.id) ?? [];
    const bestCombination = bestCombinations.find((combination) => combination.isBest);
    const bestSnapshots = bestCombination
      ? snapshotsResult.results.filter((snapshot) =>
          snapshot.monitor_id === bestMonitor.id
          && snapshot.query_outbound_date === bestCombination.outboundDate
          && snapshot.query_return_date === bestCombination.returnDate
        ).slice(-30)
      : [];
    const bestLatestSnapshot = bestSnapshots.at(-1);
    const comparison = bestLatestSnapshot
      ? offersResult.results
          .filter((offer) => offer.search_run_id === bestLatestSnapshot.search_run_id)
          .sort((a, b) => a.price_total - b.price_total)
          .slice(0, 6)
          .map((offer) => ({ carrier: offer.carrier, price: offer.price_total, stops: offer.stops }))
      : [];

    const totalCombinations = [...monitorCombinations.values()]
      .reduce((sum, combinations) => sum + combinations.length, 0);
    const queriedCombinations = [...monitorCombinations.values()]
      .reduce((sum, combinations) => sum + combinations.filter((combination) => combination.queryCount > 0).length, 0);
    const familySavings = Math.max(0, bestMonitor.previousPrice - bestMonitor.currentPrice);

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
        averageChange7d: bestMonitor.change7d,
        combinationsQueried: queriedCombinations,
        combinationsTotal: totalCombinations
      },
      priceHistory: bestSnapshots.map((snapshot) => ({
        date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
          .format(new Date(`${snapshot.captured_at}Z`)),
        price: snapshot.min_price,
        average: snapshot.avg_price
      })),
      monitors: routeMonitors,
      dateCombinations: bestCombinations,
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
