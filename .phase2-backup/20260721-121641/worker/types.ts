export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_NAME: string;
  FLIGHT_PROVIDER: 'mock' | 'amadeus';
  DEFAULT_CURRENCY: string;
  AMADEUS_CLIENT_ID?: string;
  AMADEUS_CLIENT_SECRET?: string;
  ALERT_WEBHOOK_URL?: string;
}

export interface MonitorRecord {
  id: string;
  family_id: string;
  name: string;
  origin: string;
  destination: string;
  outbound_date: string;
  return_date: string;
  adults: number;
  children: number;
  target_price: number;
  direct_only: number;
  baggage_required: number;
  currency: string;
  active: number;
  last_checked_at: string | null;
}

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
  adults: number;
  children: number;
  currency: string;
  directOnly: boolean;
  baggageRequired: boolean;
}

export interface FlightOffer {
  externalId: string;
  carrier: string;
  flightNumbers: string[];
  priceTotal: number;
  pricePerPerson: number;
  currency: string;
  stops: number;
  durationMinutes: number;
  baggageIncluded: boolean;
  departureAt?: string;
  arrivalAt?: string;
  bookingUrl?: string;
  raw?: unknown;
}

export interface FlightProvider {
  readonly name: string;
  search(request: FlightSearchRequest): Promise<FlightOffer[]>;
}
