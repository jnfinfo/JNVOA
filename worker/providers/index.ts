import { AmadeusFlightProvider } from './amadeus';
import { MockFlightProvider } from './mock';
import { SerpApiFlightProvider } from './serpapi';
import type { Env, FlightProvider } from '../types';

export function getProvider(env: Env): FlightProvider {
  if (env.FLIGHT_PROVIDER === 'serpapi') return new SerpApiFlightProvider(env);
  if (env.FLIGHT_PROVIDER === 'amadeus') return new AmadeusFlightProvider(env);
  return new MockFlightProvider();
}
