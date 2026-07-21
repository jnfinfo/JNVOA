import { isoDurationToMinutes } from '../lib/duration';
import type { Env, FlightOffer, FlightProvider, FlightSearchRequest } from '../types';

interface AmadeusTokenResponse {
  access_token?: string;
  expires_in?: number;
  error_description?: string;
}

interface AmadeusOffer {
  id: string;
  price: { total: string; currency: string };
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
  errors?: Array<{ detail?: string; title?: string }>;
}

export class AmadeusFlightProvider implements FlightProvider {
  readonly name = 'amadeus';

  constructor(private readonly env: Env) {}

  private async getToken(): Promise<string> {
    if (!this.env.AMADEUS_CLIENT_ID || !this.env.AMADEUS_CLIENT_SECRET) {
      throw new Error('Credenciais Amadeus não configuradas.');
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.env.AMADEUS_CLIENT_ID,
      client_secret: this.env.AMADEUS_CLIENT_SECRET
    });

    const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const payload = await response.json<AmadeusTokenResponse>();
    if (!response.ok || !payload.access_token) {
      throw new Error(payload.error_description ?? `Falha ao autenticar na Amadeus (${response.status}).`);
    }

    return payload.access_token;
  }

  async search(request: FlightSearchRequest): Promise<FlightOffer[]> {
    const token = await this.getToken();
    const params = new URLSearchParams({
      originLocationCode: request.origin,
      destinationLocationCode: request.destination,
      departureDate: request.outboundDate,
      returnDate: request.returnDate,
      adults: String(request.adults),
      children: String(request.children),
      currencyCode: request.currency,
      nonStop: String(request.directOnly),
      max: '20'
    });

    const response = await fetch(`https://api.amadeus.com/v2/shopping/flight-offers?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await response.json<AmadeusSearchResponse>();

    if (!response.ok) {
      const message = payload.errors?.map((error) => error.detail ?? error.title).filter(Boolean).join('; ');
      throw new Error(message || `Falha na busca Amadeus (${response.status}).`);
    }

    const passengers = Math.max(1, request.adults + request.children);

    return (payload.data ?? []).map((offer) => {
      const allSegments = offer.itineraries.flatMap((itinerary) => itinerary.segments);
      const first = allSegments[0];
      const last = allSegments.at(-1);
      const stops = offer.itineraries.reduce((sum, itinerary) => sum + Math.max(0, itinerary.segments.length - 1), 0);
      const baggageIncluded = offer.travelerPricings?.some((traveler) =>
        traveler.fareDetailsBySegment?.some((fare) =>
          (fare.includedCheckedBags?.quantity ?? 0) > 0 || (fare.includedCheckedBags?.weight ?? 0) > 0
        )
      ) ?? false;
      const priceTotal = Number(offer.price.total);

      return {
        externalId: offer.id,
        carrier: offer.validatingAirlineCodes?.[0] ?? first?.carrierCode ?? 'Companhia',
        flightNumbers: allSegments.map((segment) => `${segment.carrierCode}${segment.number}`),
        priceTotal,
        pricePerPerson: Math.round((priceTotal / passengers) * 100) / 100,
        currency: offer.price.currency,
        stops,
        durationMinutes: offer.itineraries.reduce((sum, itinerary) => sum + isoDurationToMinutes(itinerary.duration), 0),
        baggageIncluded,
        departureAt: first?.departure.at,
        arrivalAt: last?.arrival.at,
        raw: offer
      };
    }).filter((offer) => !request.baggageRequired || offer.baggageIncluded);
  }
}
