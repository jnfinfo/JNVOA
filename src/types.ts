export type PriceSignal = 'BUY' | 'WATCH' | 'HIGH';

export interface PricePoint {
  date: string;
  price: number;
  average: number;
}

export interface GoogleFlightsPriceInsight {
  searchId?: string;
  googleFlightsUrl?: string;
  lowestPriceInsight?: number;
  minimumDetailedPrice?: number;
  bestFlightsCount: number;
  otherFlightsCount: number;
  carriers: string[];
}

export interface DateCombination {
  key: string;
  outboundDate: string;
  returnDate: string;
  latestPrice: number;
  previousPrice: number;
  historicalMin: number;
  averagePrice: number;
  changePct: number;
  carrier?: string;
  stops?: number;
  durationMinutes?: number;
  baggageIncluded?: boolean;
  bookingUrl?: string;
  priceInsight?: GoogleFlightsPriceInsight;
  lastCheckedAt?: string;
  queryCount: number;
  isNext: boolean;
  isBest: boolean;
}

export interface RouteMonitor {
  id: string;
  name: string;
  origin: string;
  destination: string;
  outboundDate: string;
  outboundEndDate?: string;
  returnDate: string;
  returnEndDate?: string;
  lastQueryOutboundDate?: string;
  lastQueryReturnDate?: string;
  bestOutboundDate?: string;
  bestReturnDate?: string;
  combinationsQueried?: number;
  combinationsTotal?: number;
  adults: number;
  children: number;
  currentPrice: number;
  previousPrice: number;
  historicalMin: number;
  targetPrice: number;
  currency: string;
  carrier: string;
  provider: string;
  stops: number;
  durationMinutes: number;
  baggageIncluded: boolean;
  priceConfirmed: boolean;
  confirmedAt?: string;
  bookingUrl?: string;
  priceInsight?: GoogleFlightsPriceInsight;
  lastError?: string;
  signal: PriceSignal;
  lastCheckedAt: string;
  change7d: number;
}

export interface SerpApiQuota {
  planName: string;
  limit: number;
  used: number;
  remaining: number;
  renewalDate?: string;
  hourlyLimit?: number;
}

export interface ManualFlightOffer {
  externalId: string;
  carrier: string;
  flightNumbers: string[];
  priceTotal: number;
  pricePerPerson?: number;
  currency: string;
  stops: number;
  durationMinutes: number;
  baggageIncluded: boolean;
  departureAt?: string;
  arrivalAt?: string;
  bookingUrl?: string;
}

export interface ManualSearchResult {
  query: {
    origin: string;
    destination: string;
    outboundDate: string;
    returnDate: string;
    adults: number;
    children: number;
  };
  offers: ManualFlightOffer[];
  priceInsight?: GoogleFlightsPriceInsight;
  quota?: SerpApiQuota;
}

export interface DashboardData {
  generatedAt: string;
  provider: string;
  providerEnvironment?: string;
  quota?: SerpApiQuota;
  summary: {
    activeMonitors: number;
    bestCurrentPrice: number;
    familySavings: number;
    checksLast24h: number;
    averageChange7d: number;
    combinationsQueried?: number;
    combinationsTotal?: number;
  };
  priceHistory: PricePoint[];
  monitors: RouteMonitor[];
  dateCombinations?: DateCombination[];
  airlineComparison: Array<{ carrier: string; price: number; stops: number }>;
  weekdayPrices: Array<{ day: string; price: number; score: number }>;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    createdAt: string;
    severity: 'good' | 'info' | 'warning';
  }>;
}


export interface ManualSearchInput {
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
  adults: number;
  children: number;
  directOnly: boolean;
  baggageRequired: boolean;
}

export interface CreateMonitorInput {
  name: string;
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
  adults: number;
  children: number;
  targetPrice: number;
  directOnly: boolean;
  baggageRequired: boolean;
}
