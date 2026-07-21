import { describe, expect, it } from 'vitest';
import { mapSerpApiFlight } from '../worker/providers/serpapi';
import type { FlightSearchRequest } from '../worker/types';

const request: FlightSearchRequest = {
  origin: 'CNF',
  destination: 'REC',
  outboundDate: '2026-12-26',
  returnDate: '2027-01-04',
  adults: 2,
  children: 1,
  currency: 'BRL',
  directOnly: false,
  baggageRequired: false
};

describe('mapSerpApiFlight', () => {
  it('normaliza oferta do Google Flights', () => {
    const offer = mapSerpApiFlight({
      flights: [
        {
          departure_airport: { id: 'CNF', time: '2026-12-26 08:00' },
          arrival_airport: { id: 'REC', time: '2026-12-26 10:30' },
          airline: 'Azul',
          flight_number: 'AD 1234',
          duration: 150
        }
      ],
      total_duration: 150,
      price: 4500,
      departure_token: 'token-1',
      extensions: ['Checked baggage included']
    }, request, 0, 'https://www.google.com/travel/flights');

    expect(offer.carrier).toBe('Azul');
    expect(offer.priceTotal).toBe(4500);
    expect(offer.pricePerPerson).toBe(1500);
    expect(offer.stops).toBe(0);
    expect(offer.baggageIncluded).toBe(true);
    expect(offer.confirmed).toBe(true);
  });

  it('rejeita preço inválido', () => {
    expect(() => mapSerpApiFlight({ price: 0 }, request, 0)).toThrow(/preço válido/i);
  });
});
