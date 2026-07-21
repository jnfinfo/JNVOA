import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Plane,
  RefreshCw,
  TriangleAlert
} from 'lucide-react';
import { duration, money, percent, relativeDate, tripDate } from '../lib/format';
import type { RouteMonitor } from '../types';

const signalLabel = {
  BUY: 'Boa hora para comprar',
  WATCH: 'Acompanhar',
  HIGH: 'Preço alto'
};

interface RouteCardProps {
  monitor: RouteMonitor;
  running?: boolean;
  onRun: (id: string) => void;
}

function dateWindow(start: string, end?: string): string {
  return end && end !== start ? `${tripDate(start)} a ${tripDate(end)}` : tripDate(start);
}

export function RouteCard({ monitor, running, onRun }: RouteCardProps) {
  const falling = monitor.change7d < 0;
  const ChangeIcon = falling ? ArrowDownRight : ArrowUpRight;
  const progress = monitor.currentPrice > 0 && monitor.historicalMin > 0
    ? Math.min(100, Math.max(8, (monitor.historicalMin / monitor.currentPrice) * 100))
    : 8;

  return (
    <article className="route-card">
      <div className="route-card__head">
        <div>
          <small>{monitor.name}</small>
          <div className="route-card__route">
            <strong>{monitor.origin}</strong>
            <span><Plane size={15} /><span className="route-line" /></span>
            <strong>{monitor.destination}</strong>
          </div>
        </div>
        <span className={`signal signal--${monitor.signal.toLowerCase()}`}>{signalLabel[monitor.signal]}</span>
      </div>

      <div className="route-card__price">
        <div>
          <span>Total da família</span>
          <strong>{monitor.currentPrice > 0 ? money(monitor.currentPrice, monitor.currency) : 'Aguardando consulta'}</strong>
        </div>
        {monitor.currentPrice > 0 && (
          <div className={`route-card__change ${falling ? 'is-good' : 'is-bad'}`}>
            <ChangeIcon size={17} />
            {monitor.previousPrice > 0 ? `${percent(monitor.change7d)} na mesma data` : 'Primeira captura'}
          </div>
        )}
      </div>

      <div className={`price-proof ${monitor.priceConfirmed ? 'price-proof--confirmed' : ''}`}>
        {monitor.priceConfirmed ? <CheckCircle2 size={14} /> : <TriangleAlert size={14} />}
        <span>
          {monitor.priceConfirmed
            ? `Preço capturado no Google Flights ${monitor.confirmedAt ? relativeDate(monitor.confirmedAt) : ''}`
            : 'Preço indicativo — confirme no fornecedor antes da compra'}
        </span>
      </div>

      <div className="route-card__progress">
        <div>
          <span>Meta {money(monitor.targetPrice)}</span>
          <span>Mínimo {monitor.historicalMin > 0 ? money(monitor.historicalMin) : '—'}</span>
        </div>
        <div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="route-card__details route-card__details--windows">
        <span><ArrowRight size={15} /> Ida: {dateWindow(monitor.outboundDate, monitor.outboundEndDate)}</span>
        <span><ArrowRight size={15} /> Volta: {dateWindow(monitor.returnDate, monitor.returnEndDate)}</span>
        <span><Clock3 size={15} /> {monitor.durationMinutes ? duration(monitor.durationMinutes) : 'Aguardando'}</span>
        <span><BriefcaseBusiness size={15} /> {monitor.baggageIncluded ? 'Bagagem indicada' : 'Conferir bagagem'}</span>
      </div>

      {monitor.bestOutboundDate && monitor.bestReturnDate && (
        <div className="route-card__last-query">
          Melhor combinação: {tripDate(monitor.bestOutboundDate)} → {tripDate(monitor.bestReturnDate)}
          {monitor.combinationsTotal ? ` • ${monitor.combinationsQueried ?? 0}/${monitor.combinationsTotal} pesquisadas` : ''}
        </div>
      )}

      {monitor.lastError && (
        <div className="route-card__error" title={monitor.lastError}>
          <TriangleAlert size={14} /> Última consulta apresentou erro
        </div>
      )}

      <footer className="route-card__footer">
        <div>
          <strong>{monitor.carrier}</strong>
          <span>{monitor.provider} • atualizado {relativeDate(monitor.lastCheckedAt)}</span>
        </div>
        <div className="route-card__actions">
          {monitor.bookingUrl && (
            <a className="icon-button" href={monitor.bookingUrl} target="_blank" rel="noreferrer" title="Abrir Google Flights">
              <ExternalLink size={17} />
            </a>
          )}
          <button className="icon-button" type="button" onClick={() => onRun(monitor.id)} disabled={running} title="Consultar próxima combinação agora">
            <RefreshCw size={17} className={running ? 'is-spinning' : ''} />
          </button>
        </div>
      </footer>
    </article>
  );
}
