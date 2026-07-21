import { describe, expect, it } from 'vitest';
import { buildMonitorDatePairs, selectMonitorDates } from '../worker/lib/date-combinations';
import type { MonitorRecord } from '../worker/types';

function monitor(index = 0): MonitorRecord {
  return {
    id: 'recife',
    family_id: 'family-safadi',
    name: 'Réveillon Recife',
    origin: 'CNF',
    destination: 'REC',
    outbound_date: '2026-12-26',
    outbound_end_date: '2026-12-29',
    return_date: '2027-01-04',
    return_end_date: '2027-01-06',
    adults: 2,
    children: 0,
    target_price: 5000,
    direct_only: 0,
    baggage_required: 0,
    currency: 'BRL',
    active: 1,
    next_window_index: index,
    last_checked_at: null
  };
}

describe('combinações da janela', () => {
  it('monta as 12 combinações esperadas', () => {
    const pairs = buildMonitorDatePairs(monitor());
    expect(pairs).toHaveLength(12);
    expect(pairs[0]).toEqual({ outboundDate: '2026-12-26', returnDate: '2027-01-04' });
    expect(pairs[11]).toEqual({ outboundDate: '2026-12-29', returnDate: '2027-01-06' });
  });

  it('avança em rodízio automático', () => {
    const first = selectMonitorDates(monitor(0));
    expect(first.totalCombinations).toBe(12);
    expect(first.nextIndex).toBe(1);
    expect(first.advanceWindow).toBe(true);

    const last = selectMonitorDates(monitor(11));
    expect(last.nextIndex).toBe(0);
  });

  it('permite atualizar uma célula sem alterar o rodízio automático', () => {
    const selected = selectMonitorDates(monitor(4), {
      outboundDate: '2026-12-29',
      returnDate: '2027-01-05'
    });

    expect(selected.currentIndex).toBe(10);
    expect(selected.nextIndex).toBe(4);
    expect(selected.advanceWindow).toBe(false);
  });

  it('rejeita combinação fora da janela', () => {
    expect(() => selectMonitorDates(monitor(), {
      outboundDate: '2026-12-30',
      returnDate: '2027-01-07'
    })).toThrow(/fora da janela/i);
  });
});
