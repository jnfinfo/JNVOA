import { isoDurationToMinutes } from '../lib/duration';
import type { Env, FlightOffer, FlightProvider, FlightSearchRequest } from '../types';

interface AmadeusTokenResponse {
  access_token?: string;
  expires_in?: number;
  error_description?: string;
}

interface AmadeusOffer {
  id: string;
  type?: string;
  price: { total: string; grandTotal?: string; currency: string };
  validatingAirlineCodes?: string[];
  travelerPricings?: Array<{
    fareDetailsBySegment?: Array<{
      includedCheckedBags?: { quantity?: number; weight?: number };
    }>;
  }>;
  itineraries: Array<{
    duration?: string;
    segments: Array<{
      carrierCode: string;
      number: string;
      departure: { at: string };
      arrival: { at: string };
    }>;
  }>;
}

interface AmadeusSearchResponse {
  data?: AmadeusOffer[];
  dictionaries?: { carriers?: Record<string, string> };
  errors?: Array<{ detail?: string; title?: string; code?: number; status?: number }>;
}

interface AmadeusPriceResponse {
  data?: { flightOffers?: AmadeusOffer[] };
  errors?: Array<{ detail?: string; title?: string; code?: number; status?: number }>;
}

interface TokenCache {
  key: string;
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | undefined;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(payload: { errors?: Array<{ detail?: string; title?: string }> }, status: number): string {
  return payload.errors
    ?.map((error) => error.detail ?? error.title)
    .filter(Boolean)
    .join('; ') || `Falha na API Amadeus (${status}).`;
}

export function amadeusBaseUrl(environment: Env['AMADEUS_ENV']): string {
  return environment === 'production'
    ? 'https://api.amadeus.com'
    : 'https://test.api.amadeus.com';
}

async function fetchWithRetry(url: string, init: RequestInit, maxAttempts = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), 20_000);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.status !== 429 && response.status < 500) return response;
      if (attempt === maxAttempts) return response;

      const retryAfter = Number(response.headers.get('Retry-After'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 500 * (2 ** (attempt - 1));
      await sleep(waitMs);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) throw error;
      await sleep(500 * (2 ** (attempt - 1)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha de comunicação com a Amadeus.');
}

export function mapAmadeusOffer(
  offer: AmadeusOffer,
  passengers: number,
  carriers: Record<string, string> = {},
  confirmed = false
): FlightOffer {
  const allSegments = offer.itineraries.flatMap((itinerary) => itinerary.segments);
  const first = allSegments[0];
  const last = allSegments[allSegments.length - 1];
  const carrierCode = offer.validatingAirlineCodes?.[0] ?? first?.carrierCode ?? 'XX';
  const stops = offer.itineraries.reduce(
    (sum, itinerary) => sum + Math.max(0, itinerary.segments.length - 1),
    0
  );
  const baggageIncluded = offer.travelerPricings?.some((traveler) =>
    traveler.fareDetailsBySegment?.some((fare) =>
      (fare.includedCheckedBags?.quantity ?? 0) > 0 ||
      (fare.includedCheckedBags?.weight ?? 0) > 0
    )
  ) ?? false;
  const priceTotal = Number(offer.price.grandTotal ?? offer.price.total);

  if (!Number.isFinite(priceTotal) || priceTotal <= 0) {
    throw new Error(`Oferta Amadeus ${offer.id} retornou preço inválido.`);
  }

  return {
    externalId: offer.id,
    carrier: carriers[carrierCode] ?? carrierCode,
    carrierCode,
    flightNumbers: allSegments.map((segment) => `${segment.carrierCode}${segment.number}`),
    priceTotal,
    pricePerPerson: Math.round((priceTotal / Math.max(1, passengers)) * 100) / 100,
    currency: offer.price.currency,
    stops,
    durationMinutes: offer.itineraries.reduce(
      (sum, itinerary) => sum + isoDurationToMinutes(itinerary.duration),
      0
    ),
    baggageIncluded,
    departureAt: first?.departure.at,
    arrivalAt: last?.arrival.at,
    confirmed,
    confirmedAt: confirmed ? new Date().toISOString() : undefined,
    raw: offer
  };
}

export class AmadeusFlightProvider implements FlightProvider {
  readonly name = 'amadeus';
  private readonly baseUrl: string;

  constructor(private readonly env: Env) {
    this.baseUrl = amadeusBaseUrl(env.AMADEUS_ENV);
  }

  private invalidateToken(): void {
    tokenCache = undefined;
  }

  private async getToken(forceRefresh = false): Promise<string> {
    if (!this.env.AMADEUS_CLIENT_ID || !this.env.AMADEUS_CLIENT_SECRET) {
      throw new Error('Credenciais Amadeus não configuradas.');
    }

    const cacheKey = `${this.baseUrl}:${this.env.AMADEUS_CLIENT_ID}`;
    if (!forceRefresh && tokenCache?.key === cacheKey && tokenCache.expiresAt > Date.now() + 60_000) {
      return tokenCache.token;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.env.AMADEUS_CLIENT_ID,
      client_secret: this.env.AMADEUS_CLIENT_SECRET
    });

    const response = await fetchWithRetry(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const payload = await response.json<AmadeusTokenResponse>();
    if (!response.ok || !payload.access_token) {
      throw new Error(payload.error_description ?? `Falha ao autenticar na Amadeus (${response.status}).`);
    }

    tokenCache = {
      key: cacheKey,
      token: payload.access_token,
      expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 1_799) * 1000
    };

    return payload.access_token;
  }

  private async authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    let token = await this.getToken();
    let response = await fetchWithRetry(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      this.invalidateToken();
      token = await this.getToken(true);
      response = await fetchWithRetry(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${token}`
        }
      });
    }

    return response;
  }

  async search(request: FlightSearchRequest): Promise<FlightOffer[]> {
    const params = new URLSearchParams({
      originLocationCode: request.origin,
      destinationLocationCode: request.destination,
      departureDate: request.outboundDate,
      returnDate: request.returnDate,
      adults: String(request.adults),
      currencyCode: request.currency,
      nonStop: String(request.directOnly),
      max: '20'
    });

    if (request.children > 0) params.set('children', String(request.children));

    const response = await this.authorizedFetch(`/v2/shopping/flight-offers?${params}`);
    const payload = await response.json<AmadeusSearchResponse>();

    if (!response.ok) throw new Error(errorMessage(payload, response.status));

    const passengers = Math.max(1, request.adults + request.children);
    const carriers = payload.dictionaries?.carriers ?? {};

    return (payload.data ?? [])
      .map((offer) => mapAmadeusOffer(offer, passengers, carriers))
      .filter((offer) => !request.baggageRequired || offer.baggageIncluded);
  }

  async confirm(offer: FlightOffer): Promise<FlightOffer> {
    if (!offer.raw || typeof offer.raw !== 'object') {
      throw new Error('A oferta não possui os dados necessários para reconfirmação.');
    }

    const response = await this.authorizedFetch('/v1/shopping/flight-offers/pricing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HTTP-Method-Override': 'POST'
      },
      body: JSON.stringify({
        data: {
          type: 'flight-offers-pricing',
          flightOffers: [offer.raw]
        }
      })
    });
    const payload = await response.json<AmadeusPriceResponse>();

    if (!response.ok) throw new Error(errorMessage(payload, response.status));

    const confirmedOffer = payload.data?.flightOffers?.[0];
    if (!confirmedOffer) throw new Error('A Amadeus não retornou a oferta reconfirmada.');

    const passengers = Math.max(1, Math.round(offer.priceTotal / Math.max(offer.pricePerPerson, 1)));
    return {
      ...mapAmadeusOffer(
        confirmedOffer,
        passengers,
        { [offer.carrierCode ?? '']: offer.carrier },
        true
      ),
      bookingUrl: offer.bookingUrl
    };
  }
}
