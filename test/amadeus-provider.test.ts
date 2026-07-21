import { describe, expect, it } from 'vitest';
import { amadeusBaseUrl, mapAmadeusOffer } from '../worker/providers/amadeus';

describe('Amadeus provider', () => {
  it('seleciona o ambiente correto', () => {
    expect(amadeusBaseUrl('test')).toBe('https://test.api.amadeus.com');
    expect(amadeusBaseUrl('production')).toBe('https://api.amadeus.com');
  });

  it('normaliza oferta, companhia, bagagem e duração', () => {
    const offer = mapAmadeusOffer({
      id: '1',
      price: { total: '2500.00', grandTotal: '2520.00', currency: 'BRL' },
      validatingAirlineCodes: ['LA'],
      travelerPricings: [{
        fareDetailsBySegment: [{ includedCheckedBags: { quantity: 1 } }]
      }],
      itineraries: [{
        duration: 'PT2H30M',
        segments: [
          {
            carrierCode: 'LA',
            number: '1234',
            departure: { at: '2027-01-08T08:00:00' },
            arrival: { at: '2027-01-08T10:30:00' }
          }
        ]
      }]
    }, 4, { LA: 'LATAM Airlines' }, true);

    expect(offer.carrier).toBe('LATAM Airlines');
    expect(offer.priceTotal).toBe(2520);
    expect(offer.pricePerPerson).toBe(630);
    expect(offer.durationMinutes).toBe(150);
    expect(offer.baggageIncluded).toBe(true);
    expect(offer.confirmed).toBe(true);
  });
});
