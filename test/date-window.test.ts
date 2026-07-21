import { describe, expect, it } from 'vitest';
import { selectMonitorDates } from '../worker/services/monitor-service';
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

describe('selectMonitorDates', () => {
  it('monta 12 combinações e avança em rodízio', () => {
    const first = selectMonitorDates(monitor(0));
    expect(first.totalCombinations).toBe(12);
    expect(first.outboundDate).toBe('2026-12-26');
    expect(first.returnDate).toBe('2027-01-04');
    expect(first.nextIndex).toBe(1);
  });

  it('volta ao início depois da última combinação', () => {
    const last = selectMonitorDates(monitor(11));
    expect(last.outboundDate).toBe('2026-12-29');
    expect(last.returnDate).toBe('2027-01-06');
    expect(last.nextIndex).toBe(0);
  });
});
