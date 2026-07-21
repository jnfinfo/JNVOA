export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_NAME: string;
  FLIGHT_PROVIDER: 'mock' | 'amadeus' | 'serpapi';
  DEFAULT_CURRENCY: string;
  AMADEUS_ENV?: 'test' | 'production';
  AMADEUS_CLIENT_ID?: string;
  AMADEUS_CLIENT_SECRET?: string;
  SERPAPI_API_KEY?: string;
  ALERT_WEBHOOK_URL?: string;
}

export interface MonitorRecord {
  id: string;
  family_id: string;
  name: string;
  origin: string;
  destination: string;
  outbound_date: string;
  outbound_end_date?: string | null;
  return_date: string;
  return_end_date?: string | null;
  adults: number;
  children: number;
  target_price: number;
  direct_only: number;
  baggage_required: number;
  currency: string;
  active: number;
  next_window_index?: number;
  last_checked_at: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
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
  carrierCode?: string;
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
  confirmed?: boolean;
  confirmedAt?: string;
  raw?: unknown;
}

export interface FlightProvider {
  readonly name: string;
  search(request: FlightSearchRequest): Promise<FlightOffer[]>;
  confirm?(offer: FlightOffer): Promise<FlightOffer>;
}

export interface SerpApiQuota {
  planName: string;
  limit: number;
  used: number;
  remaining: number;
  renewalDate?: string;
  hourlyLimit?: number;
}
