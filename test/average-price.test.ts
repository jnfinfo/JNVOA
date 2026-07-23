import { describe, expect, it } from 'vitest';
import { averagePerPassenger, hasLowerPriceInsight } from '../src/lib/format';

describe('averagePerPassenger', () => {
  it('divide o total pelos passageiros e arredonda em centavos', () => {
    expect(averagePerPassenger(14_913, 6, 3)).toBe(1_657);
    expect(averagePerPassenger(100, 2, 1)).toBe(33.33);
  });

  it('protege contra divisão por zero e total inválido', () => {
    expect(averagePerPassenger(14_913, 0, 0)).toBeUndefined();
    expect(averagePerPassenger(Number.NaN, 6, 3)).toBeUndefined();
  });

  it('distingue preço indicativo de oferta detalhada', () => {
    expect(hasLowerPriceInsight({
      lowestPriceInsight: 14913,
      minimumDetailedPrice: 20749,
      bestFlightsCount: 1,
      otherFlightsCount: 1,
      carriers: ['GOL']
    })).toBe(true);

    expect(hasLowerPriceInsight({
      lowestPriceInsight: 20749,
      minimumDetailedPrice: 20749,
      bestFlightsCount: 1,
      otherFlightsCount: 1,
      carriers: ['GOL']
    })).toBe(false);
  });
});
