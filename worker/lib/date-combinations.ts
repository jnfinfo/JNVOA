import type { MonitorRecord } from '../types';

export interface DatePair {
  outboundDate: string;
  returnDate: string;
}

export interface MonitorDateSelection extends DatePair {
  currentIndex: number;
  nextIndex: number;
  totalCombinations: number;
  advanceWindow: boolean;
}

export function isoDateRange(start: string, end?: string | null): string[] {
  const effectiveEnd = end && end >= start ? end : start;
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const finalDate = new Date(`${effectiveEnd}T12:00:00Z`);

  while (cursor <= finalDate && dates.length < 31) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates.length ? dates : [start];
}

export function buildMonitorDatePairs(monitor: MonitorRecord): DatePair[] {
  const outboundDates = isoDateRange(monitor.outbound_date, monitor.outbound_end_date);
  const returnDates = isoDateRange(monitor.return_date, monitor.return_end_date);
  const pairs = outboundDates.flatMap((outboundDate) =>
    returnDates
      .filter((returnDate) => returnDate >= outboundDate)
      .map((returnDate) => ({ outboundDate, returnDate }))
  );

  return pairs.length
    ? pairs
    : [{ outboundDate: monitor.outbound_date, returnDate: monitor.return_date }];
}

export function combinationKey(pair: DatePair): string {
  return `${pair.outboundDate}_${pair.returnDate}`;
}

export function selectMonitorDates(
  monitor: MonitorRecord,
  requested?: DatePair
): MonitorDateSelection {
  const combinations = buildMonitorDatePairs(monitor);

  if (requested) {
    const requestedIndex = combinations.findIndex((pair) =>
      pair.outboundDate === requested.outboundDate && pair.returnDate === requested.returnDate
    );

    if (requestedIndex < 0) {
      throw new Error('A combinação solicitada está fora da janela monitorada.');
    }

    return {
      ...combinations[requestedIndex],
      currentIndex: requestedIndex,
      nextIndex: Math.max(0, monitor.next_window_index ?? 0) % combinations.length,
      totalCombinations: combinations.length,
      advanceWindow: false
    };
  }

  const currentIndex = Math.max(0, monitor.next_window_index ?? 0) % combinations.length;
  return {
    ...combinations[currentIndex],
    currentIndex,
    nextIndex: (currentIndex + 1) % combinations.length,
    totalCombinations: combinations.length,
    advanceWindow: true
  };
}
