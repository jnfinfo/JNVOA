import { AmadeusFlightProvider } from './amadeus';
import { MockFlightProvider } from './mock';
import type { Env, FlightProvider } from '../types';

export function getProvider(env: Env): FlightProvider {
  return env.FLIGHT_PROVIDER === 'amadeus'
    ? new AmadeusFlightProvider(env)
    : new MockFlightProvider();
}
