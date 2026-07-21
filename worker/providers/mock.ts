import type { FlightOffer, FlightProvider, FlightSearchRequest } from '../types';

function routeSeed(request: FlightSearchRequest): number {
  return [...`${request.origin}${request.destination}${request.outboundDate}`]
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export class MockFlightProvider implements FlightProvider {
  readonly name = 'mock';

  async search(request: FlightSearchRequest): Promise<FlightOffer[]> {
    const passengers = Math.max(1, request.adults + request.children);
    const seed = routeSeed(request);
    const base = request.destination === 'MCO' ? 10400 : request.destination === 'LIS' ? 12600 : 3600;
    const carriers = ['Copa Airlines', 'LATAM', 'Azul', 'Avianca', 'Gol'];

    return carriers.map((carrier, index) => {
      const variation = ((seed + index * 173) % 1700) + index * 260;
      const priceTotal = Math.round(base + variation);
      const stops = request.directOnly ? 0 : index % 3 === 0 ? 1 : index % 2;

      return {
        externalId: `mock-${seed}-${index}`,
        carrier,
        flightNumbers: [`${carrier.slice(0, 2).toUpperCase()}${120 + index * 17}`],
        priceTotal,
        pricePerPerson: Math.round(priceTotal / passengers),
        currency: request.currency,
        stops,
        durationMinutes: 90 + index * 105 + stops * 220,
        baggageIncluded: request.baggageRequired || index % 2 === 0,
        departureAt: `${request.outboundDate}T08:00:00`,
        arrivalAt: `${request.outboundDate}T18:30:00`,
        bookingUrl: undefined,
        raw: { simulated: true }
      };
    });
  }
}
