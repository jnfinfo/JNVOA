export type PriceSignal = 'BUY' | 'WATCH' | 'HIGH';

export interface PricePoint {
  date: string;
  price: number;
  average: number;
}

export interface RouteMonitor {
  id: string;
  name: string;
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
  adults: number;
  children: number;
  currentPrice: number;
  previousPrice: number;
  historicalMin: number;
  targetPrice: number;
  currency: string;
  carrier: string;
  stops: number;
  durationMinutes: number;
  baggageIncluded: boolean;
  signal: PriceSignal;
  lastCheckedAt: string;
  change7d: number;
}

export interface DashboardData {
  generatedAt: string;
  provider: string;
  summary: {
    activeMonitors: number;
    bestCurrentPrice: number;
    familySavings: number;
    checksLast24h: number;
    averageChange7d: number;
  };
  priceHistory: PricePoint[];
  monitors: RouteMonitor[];
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
