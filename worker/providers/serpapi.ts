import type { Env, FlightOffer, FlightProvider, FlightSearchRequest, SerpApiQuota } from '../types';

interface SerpApiFlightSegment {
  departure_airport?: { name?: string; id?: string; time?: string };
  arrival_airport?: { name?: string; id?: string; time?: string };
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  duration?: number;
}

interface SerpApiFlightResult {
  flights?: SerpApiFlightSegment[];
  layovers?: Array<{ duration?: number; name?: string; id?: string }>;
  total_duration?: number;
  price?: number;
  type?: string;
  airline_logo?: string;
  extensions?: string[];
  departure_token?: string;
  booking_token?: string;
}

interface SerpApiFlightsResponse {
  search_metadata?: {
    id?: string;
    status?: string;
    google_flights_url?: string;
  };
  search_parameters?: Record<string, unknown>;
  best_flights?: SerpApiFlightResult[];
  other_flights?: SerpApiFlightResult[];
  price_insights?: {
    lowest_price?: number;
    price_level?: string;
    typical_price_range?: number[];
    price_history?: Array<[number, number]>;
  };
  error?: string;
}

interface SerpApiAccountResponse {
  plan_name?: string;
  plan_renewal_date?: string | null;
  searches_per_month?: number;
  plan_searches_left?: number;
  total_searches_left?: number;
  this_month_usage?: number;
  account_rate_limit_per_hour?: number;
}

function normalizeDateTime(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString();
}

function baggageIncluded(extensions: string[] = []): boolean {
  return extensions.some((item) => {
    const normalized = item.toLowerCase();
    return (
      normalized.includes('checked bag included') ||
      normalized.includes('checked baggage included') ||
      normalized.includes('carry-on bag included') ||
      normalized.includes('carry on bag included')
    );
  });
}

function fetchWithTimeout(url: string, timeoutMs = 25_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
}

export function mapSerpApiFlight(
  result: SerpApiFlightResult,
  request: FlightSearchRequest,
  index: number,
  googleFlightsUrl?: string
): FlightOffer {
  const segments = result.flights ?? [];
  const first = segments[0];
  const last = segments[segments.length - 1];
  const passengers = Math.max(1, request.adults + request.children);
  const priceTotal = Number(result.price);

  if (!Number.isFinite(priceTotal) || priceTotal <= 0) {
    throw new Error('O Google Flights retornou uma oferta sem preço válido.');
  }

  const airlines = [...new Set(segments.map((segment) => segment.airline).filter(Boolean))] as string[];
  const carrier = airlines.length ? airlines.join(' + ') : 'Companhia não informada';
  const externalId = result.departure_token
    ?? result.booking_token
    ?? `serpapi-${request.origin}-${request.destination}-${request.outboundDate}-${request.returnDate}-${index}`;

  return {
    externalId,
    carrier,
    flightNumbers: segments.map((segment) => segment.flight_number).filter(Boolean) as string[],
    priceTotal,
    pricePerPerson: Math.round((priceTotal / passengers) * 100) / 100,
    currency: request.currency,
    stops: Math.max(0, result.layovers?.length ?? Math.max(0, segments.length - 1)),
    durationMinutes: result.total_duration ?? segments.reduce((sum, segment) => sum + (segment.duration ?? 0), 0),
    baggageIncluded: baggageIncluded(result.extensions),
    departureAt: normalizeDateTime(first?.departure_airport?.time),
    arrivalAt: normalizeDateTime(last?.arrival_airport?.time),
    bookingUrl: googleFlightsUrl,
    confirmed: true,
    confirmedAt: new Date().toISOString(),
    raw: {
      provider: 'serpapi',
      request,
      result
    }
  };
}

export class SerpApiFlightProvider implements FlightProvider {
  readonly name = 'serpapi';

  constructor(private readonly env: Env) {}

  async search(request: FlightSearchRequest): Promise<FlightOffer[]> {
    if (!this.env.SERPAPI_API_KEY) throw new Error('Chave da SerpApi não configurada.');

    const params = new URLSearchParams({
      engine: 'google_flights',
      departure_id: request.origin,
      arrival_id: request.destination,
      outbound_date: request.outboundDate,
      return_date: request.returnDate,
      type: '1',
      travel_class: '1',
      adults: String(request.adults),
      children: String(request.children),
      currency: request.currency,
      gl: 'br',
      hl: 'pt',
      sort_by: '2',
      stops: request.directOnly ? '1' : '0',
      deep_search: 'true',
      api_key: this.env.SERPAPI_API_KEY
    });

    const response = await fetchWithTimeout(
      `https://serpapi.com/search.json?${params}`,
      60_000
    );
    const payload = await response.json<SerpApiFlightsResponse>();

    if (!response.ok || payload.error) {
      throw new Error(payload.error ?? `Falha na SerpApi (${response.status}).`);
    }

    const results = [...(payload.best_flights ?? []), ...(payload.other_flights ?? [])];
    return results
      .map((item, index) => mapSerpApiFlight(item, request, index, payload.search_metadata?.google_flights_url))
      .sort((a, b) => a.priceTotal - b.priceTotal)
      .slice(0, 20);
  }
}

export async function getSerpApiQuota(env: Env): Promise<SerpApiQuota | undefined> {
  if (!env.SERPAPI_API_KEY) return undefined;

  try {
    const params = new URLSearchParams({ api_key: env.SERPAPI_API_KEY });
    const response = await fetchWithTimeout(`https://serpapi.com/account.json?${params}`, 10_000);
    if (!response.ok) return undefined;

    const account = await response.json<SerpApiAccountResponse>();
    const limit = account.searches_per_month ?? 0;
    const used = account.this_month_usage ?? Math.max(0, limit - (account.plan_searches_left ?? 0));
    const remaining = account.total_searches_left ?? account.plan_searches_left ?? Math.max(0, limit - used);

    return {
      planName: account.plan_name ?? 'SerpApi',
      limit,
      used,
      remaining,
      renewalDate: account.plan_renewal_date ?? undefined,
      hourlyLimit: account.account_rate_limit_per_hour
    };
  } catch (error) {
    console.error('Não foi possível consultar a franquia SerpApi.', error);
    return undefined;
  }
}
