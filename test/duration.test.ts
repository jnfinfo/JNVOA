import { describe, expect, it } from 'vitest';
import { isoDurationToMinutes } from '../worker/lib/duration';

describe('isoDurationToMinutes', () => {
  it('converte horas e minutos', () => {
    expect(isoDurationToMinutes('PT10H35M')).toBe(635);
  });

  it('converte dias, horas e minutos', () => {
    expect(isoDurationToMinutes('P1DT2H5M')).toBe(1565);
  });
});
