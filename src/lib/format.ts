import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GoogleFlightsPriceInsight } from '../types';

export const AVERAGE_PRICE_EXPLANATION = 'O Google Flights informa o total da oferta. A divisão apresentada é uma média entre os passageiros, não uma tarifa individual por faixa etária.';

export function money(value: number, currency = 'BRL', fractionDigits = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

export function averagePerPassenger(totalPrice: number, adults: number, children: number): number | undefined {
  const passengers = adults + children;
  if (!Number.isFinite(totalPrice) || !Number.isFinite(passengers) || totalPrice <= 0 || passengers <= 0) {
    return undefined;
  }

  return Math.round((totalPrice / passengers + Number.EPSILON) * 100) / 100;
}

export function hasLowerPriceInsight(
  insight?: GoogleFlightsPriceInsight
): insight is GoogleFlightsPriceInsight & { lowestPriceInsight: number; minimumDetailedPrice: number } {
  return Boolean(
    insight?.lowestPriceInsight
    && insight.minimumDetailedPrice
    && insight.lowestPriceInsight < insight.minimumDetailedPrice
  );
}

export function percent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}%`;
}

export function relativeDate(value: string): string {
  try {
    return formatDistanceToNowStrict(parseISO(value), { addSuffix: true, locale: ptBR });
  } catch {
    return 'agora';
  }
}

export function tripDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest ? ` ${rest}min` : ''}`;
}
